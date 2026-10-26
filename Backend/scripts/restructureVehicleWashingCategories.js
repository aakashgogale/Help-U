/**
 * One-off catalog cleanup:
 *   - Merge "Bike Washing" and "Car Wash at Home" into one "Vehicle Washing" category
 *     with "Car Wash" and "Bike Wash" sub-categories (existing documents are reused so
 *     every service, brand and audit-log reference stays valid).
 *   - Drop the redundant same-named "Nail Art & Extensions" sub-category.
 *   - Re-order home categories.
 *
 * Dry run by default. Pass --apply to write; documents are backed up to --backup-dir first.
 *   node scripts/restructureVehicleWashingCategories.js [--apply] [--backup-dir=<dir>]
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const APPLY = process.argv.includes('--apply');
const backupArg = process.argv.find((a) => a.startsWith('--backup-dir='));
const BACKUP_DIR = backupArg ? backupArg.split('=')[1] : __dirname;

const oid = (id) => new mongoose.Types.ObjectId(id);

const ID = {
  vehicleRoot: oid('6ad6053e90fc3e14cf2ebc86'), // was "Car Wash at Home"
  carSub: oid('6ada3cd23da2e73e7025d452'), // was "Car Wash at Home" (sub)
  oldBikeRoot: oid('6adb21ff4c8bf3af245c45c5'), // "Bike Washing"
  bikeSub: oid('6adb29da4c8bf3af245c5afd'), // was "car wash" under Bike Washing
  nailRoot: oid('6ad5dbbfc1c4d35666483145'),
  nailSub: oid('6ada3cd13da2e73e7025d450'),
  cctvRoot: oid('6ad87e70c9120ad65c5a5f1a'),
  bikeBrand: oid('6adb2afd4c8bf3af245c5ed9'),
  carBrand: oid('6ad6068b90fc3e14cf2ec1a5')
};

const expectTitle = (doc, title, label) => {
  if (!doc) throw new Error(`${label} not found`);
  if (doc.title !== title) throw new Error(`${label}: expected title "${title}", found "${doc.title}"`);
};

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const cats = db.collection('categories');
  const brands = db.collection('brands');
  const services = db.collection('userservices');
  const bookings = db.collection('bookings');

  const get = (col, _id) => col.findOne({ _id });
  const vehicleRoot = await get(cats, ID.vehicleRoot);
  const carSub = await get(cats, ID.carSub);
  const oldBikeRoot = await get(cats, ID.oldBikeRoot);
  const bikeSub = await get(cats, ID.bikeSub);
  const nailSub = await get(cats, ID.nailSub);
  const cctvRoot = await get(cats, ID.cctvRoot);
  const bikeBrand = await get(brands, ID.bikeBrand);
  const carBrand = await get(brands, ID.carBrand);

  expectTitle(vehicleRoot, 'Car Wash at Home', 'vehicle root');
  expectTitle(carSub, 'Car Wash at Home', 'car sub');
  expectTitle(oldBikeRoot, 'Bike Washing', 'old bike root');
  expectTitle(bikeSub, 'car wash', 'bike sub');
  expectTitle(nailSub, 'Nail Art & Extensions', 'nail sub');
  expectTitle(cctvRoot, 'CCTV & Security Services', 'cctv root');
  if (!bikeBrand || !carBrand) throw new Error('vehicle brand missing');

  // Safety: things we are about to retire must have nothing live pointing at them
  const nailRefs =
    (await services.countDocuments({ categoryId: ID.nailSub })) +
    (await bookings.countDocuments({ categoryId: ID.nailSub })) +
    (await brands.countDocuments({ $or: [{ categoryId: ID.nailSub }, { categoryIds: ID.nailSub }] }));
  const oldBikeRefs =
    (await services.countDocuments({ categoryId: ID.oldBikeRoot })) +
    (await bookings.countDocuments({ categoryId: ID.oldBikeRoot }));
  if (nailRefs || oldBikeRefs) throw new Error(`refuse to retire categories still in use (nail=${nailRefs}, bike=${oldBikeRefs})`);

  const slugTaken = await cats.find({ slug: { $in: ['vehicle-washing', 'vehicle-washing-car-wash', 'vehicle-washing-bike-wash'] } }).toArray();
  if (slugTaken.length) throw new Error(`target slug already used: ${slugTaken.map((c) => c.slug).join(', ')}`);

  const plan = [
    ['categories', ID.vehicleRoot, { title: 'Vehicle Washing', slug: 'vehicle-washing', homeOrder: 7 }],
    ['categories', ID.carSub, { title: 'Car Wash', slug: 'vehicle-washing-car-wash', homeOrder: 1 }],
    [
      'categories',
      ID.bikeSub,
      {
        parentId: ID.vehicleRoot,
        title: 'Bike Wash',
        slug: 'vehicle-washing-bike-wash',
        homeOrder: 2,
        etaDefaultMinutes: oldBikeRoot.etaDefaultMinutes || 30,
        cityIds: vehicleRoot.cityIds || []
      }
    ],
    ['brands', ID.carBrand, { categoryId: ID.carSub, categoryIds: [ID.carSub, ID.vehicleRoot] }],
    ['brands', ID.bikeBrand, { categoryId: ID.bikeSub, categoryIds: [ID.bikeSub, ID.vehicleRoot] }],
    ['categories', ID.oldBikeRoot, { status: 'deleted' }],
    ['categories', ID.nailSub, { status: 'deleted' }],
    ['categories', ID.nailRoot, { homeOrder: 8 }],
    ['categories', ID.cctvRoot, { homeOrder: 9 }]
  ];

  console.log(APPLY ? '=== APPLY ===' : '=== DRY RUN (no writes) ===');
  const backup = [];
  for (const [colName, _id, set] of plan) {
    const col = db.collection(colName);
    const before = await col.findOne({ _id });
    if (!before) throw new Error(`${colName} ${_id} missing`);
    backup.push({ collection: colName, doc: before });
    console.log(`\n${colName} ${_id} (${before.title})`);
    Object.entries(set).forEach(([k, v]) => console.log(`   ${k}: ${JSON.stringify(before[k])} -> ${JSON.stringify(v)}`));
  }

  if (!APPLY) {
    console.log('\nNo changes written. Re-run with --apply.');
    return;
  }

  const file = path.join(BACKUP_DIR, `category-restructure-backup-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  console.log(`\nBackup written: ${file}`);

  for (const [colName, _id, set] of plan) {
    const res = await db.collection(colName).updateOne({ _id }, { $set: { ...set, updatedAt: new Date() } });
    console.log(`updated ${colName} ${_id}: matched=${res.matchedCount} modified=${res.modifiedCount}`);
  }
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('FAILED:', err.message);
    process.exit(1);
  });
