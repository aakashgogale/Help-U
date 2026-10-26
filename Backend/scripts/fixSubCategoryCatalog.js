/**
 * One-off catalog fix: make sub-category tiles open their services.
 *
 * The public catalog for a category only lists brands whose categoryIds contain it and
 * services whose categoryId is it (or one of its children). Several sub-categories had
 * their brands/services attached to the parent only, so their tiles opened empty.
 *
 *   - attach each brand to the matching sub-category (parent stays in categoryIds, so the
 *     parent page is unchanged) and move its services' categoryId to that sub-category
 *   - repair CCTV services that point at a missing / deleted category
 *   - keep the PAINT25 coupon (exact category match) working for Wall Painting
 *   - set sub-categories that would still be empty to inactive until services are added
 *
 * Dry run by default. Pass --apply to write; touched documents are backed up first.
 *   node scripts/fixSubCategoryCatalog.js [--apply] [--backup-dir=<dir>]
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const APPLY = process.argv.includes('--apply');
const backupArg = process.argv.find((a) => a.startsWith('--backup-dir='));
const BACKUP_DIR = backupArg ? backupArg.split('=')[1] : __dirname;

// root title -> sub title -> brand titles whose services all move to that sub
const BRAND_TO_SUB = {
  "Men's Salon & Massage": { 'Massage for Men': ['Head & body massage'] },
  Cleaning: {
    'Bathroom & Kitchen Cleaning': ['Bathroom cleaning', 'Kitchen deep clean'],
    'Sofa & Carpet Cleaning': ['Sofa & upholstery']
  },
  'Electrician, Plumber & Carpenter': {
    Electrician: ['Switches & sockets', 'Fan install & repair'],
    Plumber: ['Plumbing & taps']
  },
  Painting: { 'Wall Painting': ['Wall Painting'] }
};

// Brand "Carpentry & assembly" mixes two subs, so its services are split by title
const SPLIT_BRAND = {
  root: 'Electrician, Plumber & Carpenter',
  brand: 'Carpentry & assembly',
  services: {
    'Door Lock / Handle Repair': 'Carpenter',
    'Furniture Assembly (Table / Chair / Shelf)': 'Furniture Assembly'
  }
};

// Sub-categories with no services at all; hidden until some are added
const HIDE_SUBS = [
  ["Women's Salon & Spa", 'Spa for Women'],
  ["Women's Salon & Spa", 'Hair Studio for Women'],
  ['Painting', 'Waterproofing'],
  ['Vehicle Washing', 'Car Wash'],
  ['Cleaning', 'Full Home Deep Clean']
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const cats = db.collection('categories');
  const brands = db.collection('brands');
  const services = db.collection('userservices');
  const coupons = db.collection('coupons');

  const activeCats = await cats.find({ status: 'active' }).toArray();
  const root = (title) => {
    const r = activeCats.find((c) => !c.parentId && c.title === title);
    if (!r) throw new Error(`root "${title}" not found`);
    return r;
  };
  const sub = (rootTitle, title) => {
    const r = root(rootTitle);
    const s = activeCats.find((c) => c.parentId && String(c.parentId) === String(r._id) && c.title === title);
    if (!s) throw new Error(`sub "${rootTitle} > ${title}" not found`);
    return s;
  };
  const brandOf = async (rootTitle, title) => {
    const r = root(rootTitle);
    const b = await brands.findOne({ title, status: 'active', categoryIds: r._id });
    if (!b) throw new Error(`brand "${title}" under "${rootTitle}" not found`);
    return b;
  };

  const ops = []; // { col, _id, set?, addToSet?, note }
  const addBrandToSub = (b, s) =>
    ops.push({ col: 'brands', _id: b._id, addToSet: { categoryIds: s._id }, note: `brand "${b.title}" += sub "${s.title}"` });
  const moveService = (svc, s, why) =>
    ops.push({ col: 'userservices', _id: svc._id, set: { categoryId: s._id }, note: `service "${svc.title}" -> "${s.title}"${why ? ` (${why})` : ''}` });

  for (const [rootTitle, subs] of Object.entries(BRAND_TO_SUB)) {
    for (const [subTitle, brandTitles] of Object.entries(subs)) {
      const s = sub(rootTitle, subTitle);
      for (const bt of brandTitles) {
        const b = await brandOf(rootTitle, bt);
        addBrandToSub(b, s);
        const svcs = await services.find({ brandId: b._id, status: { $ne: 'deleted' } }).toArray();
        if (!svcs.length) throw new Error(`brand "${bt}" has no services`);
        svcs.forEach((svc) => {
          if (String(svc.categoryId) !== String(root(rootTitle)._id)) throw new Error(`service "${svc.title}" not on root "${rootTitle}"`);
          moveService(svc, s);
        });
      }
    }
  }

  // split brand
  {
    const b = await brandOf(SPLIT_BRAND.root, SPLIT_BRAND.brand);
    const svcs = await services.find({ brandId: b._id, status: { $ne: 'deleted' } }).toArray();
    const targets = new Set();
    for (const svc of svcs) {
      const subTitle = SPLIT_BRAND.services[svc.title];
      if (!subTitle) throw new Error(`unmapped service "${svc.title}" in brand "${SPLIT_BRAND.brand}"`);
      const s = sub(SPLIT_BRAND.root, subTitle);
      moveService(svc, s);
      targets.add(String(s._id));
    }
    for (const t of targets) addBrandToSub(b, activeCats.find((c) => String(c._id) === t));
  }

  // CCTV: repair services pointing at a missing / deleted category
  {
    const cctv = root('CCTV & Security Services');
    const cctvSub = sub('CCTV & Security Services', 'CCTV Installation & Repair');
    const doorbell = await brandOf('CCTV & Security Services', 'Video Doorbells');
    const hik = await brandOf('CCTV & Security Services', 'HIKVISION');
    for (const svc of await services.find({ brandId: doorbell._id, status: 'active' }).toArray()) moveService(svc, cctv, 'category was missing');
    const insp = await services.findOne({ brandId: hik._id, title: 'BASIC INSPECTION', status: 'active' });
    if (!insp) throw new Error('BASIC INSPECTION not found');
    moveService(insp, cctvSub, 'sub-category was deleted');
    addBrandToSub(hik, cctvSub);
  }

  // PAINT25 only matches the exact service category
  {
    const wall = sub('Painting', 'Wall Painting');
    const paint = root('Painting');
    const coupon = await coupons.findOne({ code: 'PAINT25', categories: paint._id });
    if (coupon) ops.push({ col: 'coupons', _id: coupon._id, addToSet: { categories: wall._id }, note: 'coupon PAINT25 += Wall Painting' });
  }

  for (const [rt, st] of HIDE_SUBS) {
    const s = sub(rt, st);
    const live = await services.countDocuments({ categoryId: s._id, status: { $ne: 'deleted' } });
    if (live) throw new Error(`refuse to hide "${st}": it has ${live} services`);
    ops.push({ col: 'categories', _id: s._id, set: { status: 'inactive', previousStatus: 'active' }, note: `hide empty sub "${rt} > ${st}"` });
  }

  // Third-level categories (children of a sub-category) are never shown by the app.
  // Soft-delete them, but only when nothing live references them.
  const subIds = new Set(activeCats.filter((c) => c.parentId && !activeCats.find((p) => String(p._id) === String(c.parentId))?.parentId).map((c) => String(c._id)));
  for (const c of activeCats.filter((x) => x.parentId && subIds.has(String(x.parentId)))) {
    const refs =
      (await services.countDocuments({ categoryId: c._id })) +
      (await db.collection('bookings').countDocuments({ categoryId: c._id })) +
      (await brands.countDocuments({ $or: [{ categoryId: c._id }, { categoryIds: c._id }] }));
    if (refs) throw new Error(`refuse to remove "${c.title}": ${refs} references`);
    ops.push({ col: 'categories', _id: c._id, set: { status: 'deleted' }, note: `remove unreachable third-level category "${c.title}"` });
  }

  console.log(APPLY ? '=== APPLY ===' : '=== DRY RUN (no writes) ===');
  const backup = [];
  const seen = new Set();
  for (const op of ops) {
    console.log(`  ${op.note}`);
    const key = `${op.col}:${op.id || op._id}`;
    if (!seen.has(key)) {
      seen.add(key);
      backup.push({ collection: op.col, doc: await db.collection(op.col).findOne({ _id: op._id }) });
    }
  }
  console.log(`\n${ops.length} operations on ${backup.length} documents`);

  if (!APPLY) {
    console.log('No changes written. Re-run with --apply.');
    return;
  }

  const file = path.join(BACKUP_DIR, `subcategory-fix-backup-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  console.log(`Backup written: ${file}`);

  for (const op of ops) {
    const update = { $set: { ...(op.set || {}), updatedAt: new Date() } };
    if (op.addToSet) update.$addToSet = op.addToSet;
    const res = await db.collection(op.col).updateOne({ _id: op._id }, update);
    if (res.matchedCount !== 1) throw new Error(`update failed for ${op.col} ${op._id}`);
  }
  console.log('All updates applied.');
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('FAILED:', err.message);
    process.exit(1);
  });
