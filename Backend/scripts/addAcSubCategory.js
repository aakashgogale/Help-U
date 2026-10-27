/**
 * One-off: give AC its own tile under "AC & Appliance Repair".
 *
 * AC was the root page itself: its services sat directly on "AC & Appliance Repair", mixed with the
 * tiles for the other appliances. This creates an "AC" sub-category (a tile like Cooler or Washing
 * Machine) and moves the AC services into it, so the root page can simply be a set of appliance
 * tiles: AC, Washing Machine, Refrigerator, Geyser...
 *
 *   - the AC sub-category gets the Brand question (and an optional AC type question)
 *   - the live services on the root, and the brand sections that list them, move to it
 *   - carts holding those services are repointed (their category follows the service)
 *   - the root's own Brand question is removed (it has no services of its own any more)
 *
 * A few services were filed under the root although they are not for an AC (washing machine drum
 * repair, RO filters...). The clear ones go to their own appliance instead; two that could be either
 * ("Comprehensive Diagnosis & Inspection", "Annual Filter Replacement Combo") stay under AC.
 *
 * Past bookings keep their category as it was. Dry run by default; --apply writes, with a backup.
 *   node scripts/addAcSubCategory.js [--apply] [--backup-dir=<dir>]
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

// Services filed under the root that belong to another appliance: title -> that appliance
const RELOCATE = {
  'Excessive Vibration & Noise Repair': 'Washing Machine',
  'Water Drain / Inlet Pipe Repair': 'Washing Machine',
  'Annual Washer Care & Descaling Combo': 'Washing Machine',
  'External Pre-Filter (Spun Candle) Change': 'RO/Water Purifier',
  'Comprehensive RO Servicing': 'RO/Water Purifier'
};

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const cats = db.collection('categories');
  const brands = db.collection('brands');
  const services = db.collection('userservices');
  const carts = db.collection('carts');

  const root = await cats.findOne({ title: 'AC & Appliance Repair', parentId: null, status: 'active' });
  if (!root) throw new Error('root "AC & Appliance Repair" not found');
  if (await cats.findOne({ parentId: root._id, title: 'AC' })) throw new Error('an "AC" sub-category already exists');
  const slug = 'air-conditioner';
  if (await cats.findOne({ slug })) throw new Error(`slug "${slug}" is already used`);

  const rootBrand = (root.detailFields || []).find((f) => f.key === 'brand');
  if (!rootBrand) throw new Error('the root has no Brand question to carry over');

  const live = await services.find({ categoryId: root._id, status: { $ne: 'deleted' } }).toArray();
  if (live.length === 0) throw new Error('no live services on the root');
  const siblings = await cats.find({ parentId: root._id, status: 'active' }).toArray();

  // Where each live service goes: the AC tile, or its own appliance
  const otherBrand = await brands.findOne({ title: /^\s*other\s*$/i, status: 'active' });
  if (!otherBrand) throw new Error('the generic "Other" brand was not found');
  const toAppliance = new Map(); // service id -> target sub-category
  live.forEach((svc) => {
    const target = RELOCATE[svc.title] && siblings.find((c) => c.title === RELOCATE[svc.title]);
    if (RELOCATE[svc.title] && !target) throw new Error(`appliance "${RELOCATE[svc.title]}" not found for "${svc.title}"`);
    if (target) toAppliance.set(String(svc._id), target);
  });
  const stay = live.filter((svc) => !toAppliance.has(String(svc._id)));
  const movedIds = stay.map((s) => s._id);

  const firstOrder = Math.min(...siblings.map((s) => Number(s.homeOrder) || 0));

  const { fields, error } = sanitizeDetailFields([
    rootBrand,
    { key: 'ac_type', label: 'AC type', type: 'select', options: ['Split', 'Window', 'Other'], required: false, helpText: 'Helps the professional bring the right tools.' }
  ]);
  if (error) throw new Error(error);

  const acId = new mongoose.Types.ObjectId();
  const acSub = {
    _id: acId,
    title: 'AC',
    slug,
    parentId: root._id,
    homeIconUrl: '/ServiceIcon/ac.svg',
    homeBadge: null,
    hasSaleBadge: false,
    showOnHome: true,
    homeOrder: firstOrder - 1,
    imageUrl: null,
    status: 'active',
    publishStatus: 'published',
    isPopular: false,
    cityIds: root.cityIds || [],
    hasBrands: true,
    bookingsLabel: '',
    heroBanner: root.heroBanner,
    isEmergencyAvailable: false,
    sortOrder: 0,
    subCategoryBadge: '',
    etaDefaultMinutes: root.etaDefaultMinutes || 45,
    detailFields: fields,
    createdBy: root.createdBy,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Brand sections that list the moved services now belong to AC instead of the root
  const sectionBrands = await brands.find({ status: 'active', $or: [{ categoryIds: root._id }, { categoryId: root._id }] }).toArray();
  const brandOps = [];
  const emptied = [];
  for (const b of sectionBrands) {
    const staying = await services.countDocuments({ brandId: b._id, _id: { $in: movedIds } });
    const leaving = (await services.find({ brandId: b._id, status: { $ne: 'deleted' }, categoryId: root._id }).project({ _id: 1 }).toArray())
      .filter((x) => toAppliance.has(String(x._id))).length;
    if (staying) {
      const ids = (b.categoryIds || []).filter((c) => String(c) !== String(root._id));
      brandOps.push({
        _id: b._id,
        set: { categoryIds: [...ids, acId], ...(String(b.categoryId) === String(root._id) ? { categoryId: acId } : {}) },
        note: `section "${b.title}" -> AC`
      });
    } else if (leaving) {
      emptied.push(b);
    }
  }
  // The merged section was created with the generic "Other" logo; give it a neutral AC picture
  const aiBrand = sectionBrands.find((b) => b.slug === 'ac-repair-installation');
  const sibling = sectionBrands.find((b) => b.title === 'Super saver packages' && b.iconUrl);
  const iconFix = aiBrand && sibling ? { _id: aiBrand._id, iconUrl: sibling.iconUrl } : null;

  const cartDocs = await carts.find({ 'items.serviceId': { $in: live.map((x) => x._id) } }).toArray();
  const cartOps = cartDocs.map((c) => ({
    _id: c._id,
    items: c.items.map((it) => {
      const id = it.serviceId && String(it.serviceId);
      if (!id || !live.some((x) => String(x._id) === id)) return it;
      const target = toAppliance.get(id);
      return { ...it, categoryId: target ? target._id : acId, category: target ? target.title : 'AC', categoryTitle: target ? target.title : 'AC' };
    })
  }));

  console.log(APPLY ? '=== APPLY ===' : '=== DRY RUN (no writes) ===');
  console.log(`New tile: "AC" (/user/category/${slug}), first among ${siblings.length} appliance tiles, ${fields.length} questions (Brand with ${rootBrand.options.length} choices, AC type)`);
  console.log(`\nServices moved to AC: ${stay.length}`);
  stay.forEach((s) => console.log(`   ${s.title} ₹${s.basePrice}`));
  console.log(`\nServices filed under the right appliance instead: ${toAppliance.size}`);
  live.filter((s) => toAppliance.has(String(s._id))).forEach((s) => console.log(`   ${s.title} ₹${s.basePrice}  ->  ${toAppliance.get(String(s._id)).title}`));
  console.log(`\nBrand sections moved to AC: ${brandOps.length} | sections left empty and switched off: ${emptied.map((b) => b.title).join(', ') || 'none'}`);
  console.log(`Carts repointed: ${cartOps.length} | root Brand question removed`);
  if (!APPLY) {
    console.log('\nNo changes written. Re-run with --apply.');
    return;
  }

  const backup = [
    { collection: 'categories', doc: root },
    ...live.map((doc) => ({ collection: 'userservices', doc })),
    ...sectionBrands.map((doc) => ({ collection: 'brands', doc })),
    ...cartDocs.map((doc) => ({ collection: 'carts', doc })),
    { createdCategoryId: String(acId) }
  ];
  const file = path.join(BACKUP_DIR, `ac-subcategory-backup-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  console.log(`\nBackup written: ${file}`);

  const now = new Date();
  await cats.insertOne(acSub);
  const moved = await services.updateMany({ _id: { $in: movedIds } }, { $set: { categoryId: acId, updatedAt: now } });
  if (moved.modifiedCount !== stay.length) throw new Error(`expected ${stay.length} services moved, got ${moved.modifiedCount}`);
  for (const [id, target] of toAppliance) {
    await services.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: { categoryId: target._id, brandId: otherBrand._id, updatedAt: now } });
  }
  for (const b of emptied) await brands.updateOne({ _id: b._id }, { $set: { status: 'inactive', updatedAt: now } });
  for (const op of brandOps) await brands.updateOne({ _id: op._id }, { $set: { ...op.set, updatedAt: now } });
  if (iconFix) await brands.updateOne({ _id: iconFix._id }, { $set: { iconUrl: iconFix.iconUrl, updatedAt: now } });
  for (const op of cartOps) await carts.updateOne({ _id: op._id }, { $set: { items: op.items, updatedAt: now } });
  await cats.updateOne({ _id: root._id }, { $set: { detailFields: [], updatedAt: now } });
  console.log('All updates applied.');
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('FAILED:', err.message);
    process.exit(1);
  });
