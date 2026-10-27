/**
 * One-off catalog restructure for "AC & Appliance Repair" (the Urban Company way):
 *
 *   BEFORE  every appliance repeated the same few services under each brand
 *           (Voltas > Visit, Service & Repair, Installation ...; Godrej > Visit, ...)
 *   AFTER   one list of services per appliance, and the brand is a question the customer answers in
 *           a bottom sheet when adding (Brand: Voltas / Godrej / ...), saved with the cart item,
 *           the booking, and shown to the professional.
 *
 * It covers the appliance sub-categories AND the root itself, where the AC services live (one copy per
 * AC brand next to distinct sections like "Power Jet Service" and "Super saver packages", which are
 * left exactly as they are: only services that appear under several brands are merged).
 *
 * What it does, per sub-category (the root is handled the same way, under a new "AC repair &
 * installation" section instead of "Other"):
 *   1. groups the services by what they really are (typos like "installtion" are treated as one)
 *   2. keeps ONE service per group (preferring the generic "Other" brand's), under the "Other" brand;
 *      the rest are soft-deleted (status 'deleted'), never removed
 *   3. repoints carts, and any coupon / plan / add-on, from a merged service to the kept one; a cart
 *      item that was for a brand keeps that brand as its answer
 *   4. adds a required "Brand" question to the sub-category, listing the brands it had
 *   5. switches off brands that no longer have anything to show (nothing is deleted)
 *
 * Past bookings keep pointing at the old service documents, which still exist.
 *
 * Dry run by default. Pass --apply to write; every document it changes is backed up first.
 *   node scripts/restructureApplianceBrands.js [--apply] [--backup-dir=<dir>]
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
const { sanitizeDetailFields } = require('../utils/detailFields');

const APPLY = process.argv.includes('--apply');
const backupArg = process.argv.find((a) => a.startsWith('--backup-dir='));
const BACKUP_DIR = backupArg ? backupArg.split('=')[1] : __dirname;

const ROOT_TITLE = 'AC & Appliance Repair';

const clean = (t) => String(t || '').replace(/\s+/g, ' ').trim();
const letters = (t) => clean(t).toLowerCase().replace(/[^a-z]/g, '');

// What a service really is, ignoring the typos and spacing in its title
const kindOf = (title) => {
  const k = letters(title);
  if (k === 'visit') return { key: 'visit', title: 'Visit' };
  if (/^reinst/.test(k)) return { key: 'reinstall', title: 'Re-install' };
  if (/^inst/.test(k)) return { key: 'installation', title: 'Installation' };
  if (/servic/.test(k) && /repair/.test(k) && k.length <= 18) return { key: 'service-repair', title: 'Service & Repair' };
  const tidy = clean(title);
  return { key: k, title: tidy.charAt(0).toUpperCase() + tidy.slice(1) };
};

// "VOLTAS" -> "Voltas", "BLUE STAR" -> "Blue Star", "LG" stays "LG"
const brandLabel = (title) =>
  clean(title).split(' ').map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())).join(' ');

const idStr = (x) => String(x && x._id ? x._id : x);

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const cats = db.collection('categories');
  const brands = db.collection('brands');
  const services = db.collection('userservices');
  const carts = db.collection('carts');

  const root = await cats.findOne({ title: ROOT_TITLE, parentId: null, status: 'active' });
  if (!root) throw new Error(`root "${ROOT_TITLE}" not found`);
  const subs = await cats.find({ parentId: root._id, status: 'active' }).toArray();
  const subIds = subs.map((s) => s._id);

  const otherBrand = await brands.findOne({ title: /^\s*other\s*$/i, status: 'active', categoryIds: { $in: subIds } });
  if (!otherBrand) throw new Error('the generic "Other" brand was not found');

  const allBrands = await brands.find({ status: 'active' }).toArray();
  const brandById = new Map(allBrands.map((b) => [String(b._id), b]));

  const ops = []; // { col, _id, set?, note }
  const backupDocs = new Map(); // "col:id" -> doc
  const remember = async (col, doc) => backupDocs.set(`${col}:${doc._id}`, { collection: col, doc });

  const keptIds = new Set();
  const mergedInto = new Map(); // old service id -> { keeper, groupTitle, brandTitle, options }
  const summary = [];

  // Merges the duplicated services of one category. `onlyDuplicates` leaves services that exist under
  // a single brand alone (the root's distinct sections). Returns the Brand question's choices.
  const processCategory = async (cat, { keeperBrandId, onlyDuplicates, alwaysKeep }) => {
    const svcs = await services.find({ categoryId: cat._id, status: { $ne: 'deleted' } }).toArray();
    const groups = new Map();
    svcs.forEach((s) => {
      const kind = kindOf(s.title);
      if (!groups.has(kind.key)) groups.set(kind.key, { title: kind.title, members: [] });
      groups.get(kind.key).members.push(s);
    });

    // The brands this category had, as the choices of its Brand question
    const copied = onlyDuplicates ? [...groups.values()].filter((g) => g.members.length > 1).flatMap((g) => g.members) : svcs;
    const brandOptions = [];
    const fromBrands = [
      ...allBrands.filter((b) => (b.categoryIds || []).map(String).includes(String(cat._id)) && !onlyDuplicates),
      ...[...new Set(copied.map((s) => String(s.brandId)))].map((id) => brandById.get(id)).filter(Boolean)
    ];
    fromBrands.forEach((b) => {
      if (/^\s*other\s*$/i.test(b.title)) return;
      const label = brandLabel(b.title);
      if (label && !brandOptions.includes(label)) brandOptions.push(label);
    });
    brandOptions.sort((a, b) => a.localeCompare(b));
    brandOptions.push('Other');

    let kept = 0;
    let removed = 0;
    const lines = [];
    for (const [, group] of groups) {
      const members = group.members;
      if (onlyDuplicates && members.length < 2) continue; // a distinct section: leave it alone

      const keeper = members.find((m) => String(m.brandId) === String(alwaysKeep))
        || members.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
      if (keeper.status !== 'active' || keeper.publishStatus === 'draft') {
        const alt = members.find((m) => m.status === 'active' && m.publishStatus !== 'draft');
        if (!alt) throw new Error(`"${group.title}" in ${cat.title} has no active service to keep`);
        Object.assign(keeper, alt);
      }

      const prices = [...new Set(members.map((m) => m.basePrice))].sort((a, b) => a - b);
      lines.push(`${group.title}: keep ₹${keeper.basePrice}${prices.length > 1 ? ` (brands had ₹${prices.join('/')})` : ''}, merge ${members.length - 1}`);

      ops.push({ col: 'userservices', _id: keeper._id, set: { title: group.title, brandId: keeperBrandId }, note: `keep "${group.title}" in ${cat.title}` });
      await remember('userservices', keeper);
      keptIds.add(String(keeper._id));
      kept++;

      for (const m of members) {
        if (String(m._id) === String(keeper._id)) continue;
        const brand = brandById.get(String(m.brandId));
        mergedInto.set(String(m._id), { keeper, groupTitle: group.title, brandTitle: brand ? brandLabel(brand.title) : null, options: brandOptions });
        ops.push({ col: 'userservices', _id: m._id, set: { status: 'deleted' }, note: `merge "${m.title}" (${brand ? brand.title : '?'}) into "${group.title}"` });
        await remember('userservices', m);
        removed++;
      }
    }

    const { fields, error } = sanitizeDetailFields([
      ...(cat.detailFields || []).filter((f) => f.key !== 'brand'),
      { key: 'brand', label: 'Brand', type: 'select', options: brandOptions, required: true, helpText: 'So the professional comes prepared.' }
    ]);
    if (error) throw new Error(`${cat.title}: ${error}`);
    ops.push({ col: 'categories', _id: cat._id, set: { detailFields: fields }, note: `add "Brand" question to ${cat.title} (${brandOptions.length} choices)` });
    await remember('categories', cat);

    summary.push({ sub: cat.title, before: svcs.length, kept, removed, lines });
  };

  for (const sub of subs) await processCategory(sub, { keeperBrandId: otherBrand._id, onlyDuplicates: false, alwaysKeep: otherBrand._id });

  // The root: its own new section for the merged AC services, in the cities "Other" is in
  const acBrandId = new mongoose.Types.ObjectId();
  const acBrand = {
    _id: acBrandId,
    title: 'AC repair & installation',
    slug: 'ac-repair-installation',
    categoryId: root._id,
    categoryIds: [root._id],
    cityIds: otherBrand.cityIds || [],
    iconUrl: otherBrand.iconUrl || '',
    badge: null,
    routePath: '/user/brand/ac-repair-installation',
    status: 'active',
    isPopular: false,
    isFeatured: false,
    rating: 0,
    totalBookings: 0,
    createdBy: otherBrand.createdBy,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  if (await brands.findOne({ slug: acBrand.slug })) throw new Error('the "AC repair & installation" brand already exists');
  await processCategory(root, { keeperBrandId: acBrandId, onlyDuplicates: true, alwaysKeep: otherBrand._id });

  // Brands left with nothing to show are switched off; one used elsewhere only loses the appliance links
  const mergedAway = new Set(mergedInto.keys());
  // Services under a deleted category can't be reached, so they don't keep a brand on show
  const activeCatIds = new Set((await cats.find({ status: 'active' }).project({ _id: 1 }).toArray()).map((c) => String(c._id)));
  const applianceBrands = allBrands.filter((b) => String(b._id) !== String(otherBrand._id)
    && ((b.categoryIds || []).some((c) => [...subIds, root._id].some((s) => String(s) === String(c)))
      || String(b.categoryId) === String(root._id)));
  const brandActions = [];
  for (const b of applianceBrands) {
    const left = (await services.find({ brandId: b._id, status: { $ne: 'deleted' } }).project({ _id: 1, categoryId: 1 }).toArray())
      .filter((x) => !mergedAway.has(String(x._id)) && !keptIds.has(String(x._id)) && activeCatIds.has(String(x.categoryId)));
    const outsideCats = (b.categoryIds || []).filter((c) => ![...subIds, root._id].some((s) => String(s) === String(c)) && activeCatIds.has(String(c)));
    if (left.length === 0 && outsideCats.length === 0) {
      ops.push({ col: 'brands', _id: b._id, set: { status: 'inactive' }, note: `switch off brand "${b.title}" (its services were merged)` });
      brandActions.push(`off ${b.title}`);
    } else if ((b.categoryIds || []).some((c) => subIds.some((s) => String(s) === String(c)))) {
      const keep = (b.categoryIds || []).filter((c) => !subIds.some((s) => String(s) === String(c)));
      if (keep.length === 0) throw new Error(`brand "${b.title}" still has ${left.length} services but would be left without categories`);
      ops.push({ col: 'brands', _id: b._id, set: { categoryIds: keep }, note: `unlink "${b.title}" from the appliance sub-categories` });
      brandActions.push(`unlink ${b.title} (${left.length} services remain)`);
    }
    await remember('brands', b);
  }
  await remember('brands', otherBrand);

  // Carts: repoint to the kept service; a brand-specific item keeps its brand as the answer
  const oldIds = [...mergedInto.keys()].map((id) => new mongoose.Types.ObjectId(id));
  const cartDocs = await carts.find({ 'items.serviceId': { $in: oldIds } }).toArray();
  const cartOps = [];
  for (const cart of cartDocs) {
    const items = cart.items.map((it) => {
      const hit = it.serviceId && mergedInto.get(String(it.serviceId));
      if (!hit) return it;
      const brandAnswer = hit.brandTitle && hit.options.includes(hit.brandTitle) ? hit.brandTitle : 'Other';
      return {
        ...it,
        serviceId: hit.keeper._id,
        title: hit.groupTitle,
        ...(it.card ? { card: { ...it.card, title: hit.groupTitle } } : {}),
        sectionTitle: '',
        details: [{ key: 'brand', label: 'Brand', value: brandAnswer }]
      };
    });
    cartOps.push({ _id: cart._id, items });
    await remember('carts', cart);
  }

  // Anything else that names a merged service is repointed too (none expected)
  const arrayRefs = [['coupons', 'services'], ['plans', 'freeServices'], ['addons', 'serviceIds']];
  const refOps = [];
  for (const [col, field] of arrayRefs) {
    const docs = await db.collection(col).find({ [field]: { $in: oldIds } }).toArray();
    for (const d of docs) {
      const next = [...new Set(d[field].map((id) => { const hit = mergedInto.get(String(id)); return String(hit ? hit.keeper._id : id); }))]
        .map((id) => new mongoose.Types.ObjectId(id));
      refOps.push({ col, _id: d._id, set: { [field]: next }, note: `repoint ${col}.${field}` });
      await remember(col, d);
    }
  }
  // Reviews follow the kept service so its rating is not lost in the merge
  const reviewDocs = await db.collection('reviews').find({ serviceId: { $in: oldIds } }).toArray();
  for (const d of reviewDocs) {
    refOps.push({ col: 'reviews', _id: d._id, set: { serviceId: mergedInto.get(String(d.serviceId)).keeper._id }, note: 'repoint review' });
    await remember('reviews', d);
  }

  // Plans can also name a merged service as a bonus
  const bonusPlans = await db.collection('plans').find({ 'bonusServices.serviceId': { $in: oldIds } }).toArray();
  for (const d of bonusPlans) {
    const next = d.bonusServices.map((b) => {
      const hit = b.serviceId && mergedInto.get(String(b.serviceId));
      return hit ? { ...b, serviceId: hit.keeper._id } : b;
    });
    refOps.push({ col: 'plans', _id: d._id, set: { bonusServices: next }, note: 'repoint plans.bonusServices' });
    await remember('plans', d);
  }
  const bookingRefs = await db.collection('bookings').countDocuments({ serviceId: { $in: oldIds } });

  console.log(APPLY ? '=== APPLY ===' : '=== DRY RUN (no writes) ===');
  summary.forEach((s) => {
    console.log(`\n${s.sub}: ${s.before} services -> ${s.kept}  (merged away ${s.removed})`);
    s.lines.forEach((l) => console.log(`   ${l}`));
  });
  brandActions.forEach((a) => console.log(`   brand: ${a}`));
  console.log(`\nBrands: ${brandActions.length} (${brandActions.filter((a) => a.startsWith('off')).length} switched off, ${brandActions.filter((a) => a.startsWith('unlink')).length} unlinked)`);
  console.log('New section for the merged AC services: "AC repair & installation"');
  console.log(`Carts repointed: ${cartOps.length} | other references repointed: ${refOps.length}`);
  console.log(`Reviews moved to the kept service: ${reviewDocs.length} | past bookings pointing at merged services (left as they are): ${bookingRefs}`);
  console.log(`Total changes: ${ops.length + cartOps.length + refOps.length} on ${backupDocs.size} documents`);

  if (!APPLY) {
    console.log('\nNo changes written. Re-run with --apply.');
    return;
  }

  const file = path.join(BACKUP_DIR, `appliance-restructure-backup-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify([...backupDocs.values()], null, 2));
  console.log(`\nBackup written: ${file}`);

  const now = new Date();
  await brands.insertOne(acBrand);
  console.log('Created brand section "AC repair & installation".');
  for (const op of [...ops, ...refOps]) {
    const res = await db.collection(op.col).updateOne({ _id: op._id }, { $set: { ...op.set, updatedAt: now } });
    if (res.matchedCount !== 1) throw new Error(`update failed for ${op.col} ${op._id}`);
  }
  for (const c of cartOps) {
    const res = await carts.updateOne({ _id: c._id }, { $set: { items: c.items, updatedAt: now } });
    if (res.matchedCount !== 1) throw new Error(`cart update failed ${c._id}`);
  }
  console.log('All updates applied.');
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('FAILED:', err.message);
    process.exit(1);
  });
