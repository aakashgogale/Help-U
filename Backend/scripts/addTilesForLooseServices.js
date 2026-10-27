/**
 * One-off: make the mixed categories a clean set of tiles.
 *
 * A category page with two or more tiles now lists only services filed directly on it (see the public
 * catalog). Two categories still have such loose services, so each gets a tile of its own:
 *   Cleaning              -> "Cleaning Packages"  (the 2 package services)
 *   Men's Salon & Massage -> "Haircut & Grooming" (haircut, beard, packages, tan removal)
 * The new tile gets the parent's cities, banner and ETA; the brand sections that list the moved
 * services are linked to it. Carts holding those services are repointed. Past bookings are untouched.
 *
 * Dry run by default; --apply writes, after saving a backup of every document it changes.
 *   node scripts/addTilesForLooseServices.js [--apply] [--backup-dir=<dir>]
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const APPLY = process.argv.includes('--apply');
const backupArg = process.argv.find((a) => a.startsWith('--backup-dir='));
const BACKUP_DIR = backupArg ? backupArg.split('=')[1] : __dirname;

const PLANS = [
  { root: 'Cleaning', tile: 'Cleaning Packages', slug: 'cleaning-packages' },
  { root: "Men's Salon & Massage", tile: 'Haircut & Grooming', slug: 'haircut-grooming' }
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const cats = db.collection('categories');
  const brands = db.collection('brands');
  const services = db.collection('userservices');
  const carts = db.collection('carts');

  const backup = [];
  const writes = []; // functions run on --apply
  console.log(APPLY ? '=== APPLY ===' : '=== DRY RUN (no writes) ===');

  for (const plan of PLANS) {
    const root = await cats.findOne({ title: plan.root, parentId: null, status: 'active' });
    if (!root) throw new Error(`"${plan.root}" not found`);
    if (await cats.findOne({ $or: [{ slug: plan.slug }, { parentId: root._id, title: plan.tile }] })) throw new Error(`"${plan.tile}" already exists`);

    const loose = await services.find({ categoryId: root._id, status: { $ne: 'deleted' } }).toArray();
    if (!loose.length) throw new Error(`no loose services on "${plan.root}"`);
    const looseIds = new Set(loose.map((s) => String(s._id)));

    const tileId = new mongoose.Types.ObjectId();
    const tile = {
      _id: tileId, title: plan.tile, slug: plan.slug, parentId: root._id,
      homeIconUrl: root.homeIconUrl || '', homeBadge: null, hasSaleBadge: false, showOnHome: true,
      homeOrder: 0, imageUrl: null, status: 'active', publishStatus: 'published', isPopular: false,
      cityIds: root.cityIds || [], hasBrands: false, bookingsLabel: '', heroBanner: root.heroBanner,
      isEmergencyAvailable: false, sortOrder: 0, subCategoryBadge: '', etaDefaultMinutes: root.etaDefaultMinutes || 45,
      detailFields: [], createdBy: root.createdBy, createdAt: new Date(), updatedAt: new Date()
    };

    // brand sections that list the moved services
    const rootBrands = await brands.find({ status: 'active', $or: [{ categoryIds: root._id }, { categoryId: root._id }] }).toArray();
    const brandOps = [];
    for (const b of rootBrands) {
      const mine = await services.find({ brandId: b._id, status: { $ne: 'deleted' } }).project({ _id: 1, categoryId: 1 }).toArray();
      const moving = mine.filter((x) => looseIds.has(String(x._id))).length;
      if (!moving) continue;
      const staysOnRoot = mine.filter((x) => String(x.categoryId) === String(root._id) && !looseIds.has(String(x._id))).length;
      const ids = (b.categoryIds || []).filter((c) => staysOnRoot || String(c) !== String(root._id));
      brandOps.push({ b, set: { categoryIds: [...ids, tileId], ...(!staysOnRoot && String(b.categoryId) === String(root._id) ? { categoryId: tileId } : {}) } });
    }

    const cartDocs = await carts.find({ 'items.serviceId': { $in: loose.map((s) => s._id) } }).toArray();

    console.log(`\n${plan.root}: new tile "${plan.tile}" (/user/category/${root.slug}/${plan.slug})`);
    loose.forEach((s) => console.log(`   ${s.title} ₹${s.basePrice}`));
    console.log(`   brand sections linked: ${brandOps.map((o) => o.b.title).join(', ')} | carts repointed: ${cartDocs.length}`);

    backup.push({ collection: 'categories', doc: root }, ...loose.map((doc) => ({ collection: 'userservices', doc })),
      ...brandOps.map((o) => ({ collection: 'brands', doc: o.b })), ...cartDocs.map((doc) => ({ collection: 'carts', doc })), { createdCategoryId: String(tileId) });

    writes.push(async () => {
      const now = new Date();
      await cats.insertOne(tile);
      const r = await services.updateMany({ _id: { $in: loose.map((s) => s._id) } }, { $set: { categoryId: tileId, updatedAt: now } });
      if (r.modifiedCount !== loose.length) throw new Error(`expected ${loose.length} services moved, got ${r.modifiedCount}`);
      for (const o of brandOps) await brands.updateOne({ _id: o.b._id }, { $set: { ...o.set, updatedAt: now } });
      for (const c of cartDocs) {
        const items = c.items.map((it) => (it.serviceId && looseIds.has(String(it.serviceId)) ? { ...it, categoryId: tileId, category: plan.tile, categoryTitle: plan.tile } : it));
        await carts.updateOne({ _id: c._id }, { $set: { items, updatedAt: now } });
      }
    });
  }

  if (!APPLY) { console.log('\nNo changes written. Re-run with --apply.'); return; }
  const file = path.join(BACKUP_DIR, `loose-services-backup-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  console.log(`\nBackup written: ${file}`);
  for (const w of writes) await w();
  console.log('All updates applied.');
};

run().then(() => process.exit(0)).catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
