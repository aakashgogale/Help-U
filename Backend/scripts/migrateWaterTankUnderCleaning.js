/**
 * Move "Water Tank Cleaning" under "Cleaning".
 *
 * Water Tank Cleaning is a service line of Cleaning, not a top-level category.
 * The tree allows only two levels, so the top-level "water-tank-cleaning" cannot
 * itself be re-parented (it has children). Instead:
 *   1. its active sub-category is re-parented under Cleaning (and re-slugged to the
 *      `<parent>-<tail>` convention);
 *   2. the now-empty top-level category is soft-deleted (status='deleted',
 *      previousStatus kept) exactly like the admin delete does, so it is restorable;
 *   3. HomeContent, Brand and Cart references to the old top-level id are re-pointed
 *      to the moved sub-category so nothing is left referencing a deleted category.
 *      Live services, active bookings and coupons on the old root abort the run.
 *
 * Dry-run by default. Pass --apply to write. A JSON backup of every touched
 * document is written to scripts/backups/ before any change. Idempotent.
 *
 *   node scripts/migrateWaterTankUnderCleaning.js           # report only
 *   node scripts/migrateWaterTankUnderCleaning.js --apply   # write
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Category = require('../models/Category');
const Brand = require('../models/Brand');
const UserService = require('../models/UserService');
const Booking = require('../models/Booking');
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');
const HomeContent = require('../models/HomeContent');
const { buildSubCategorySlug } = require('../utils/categorySlug');
const { invalidatePublicCatalogKeys } = require('../utils/catalogCache');

const APPLY = process.argv.includes('--apply');

const CLEANING_SLUG = 'cleaning';
const OLD_ROOT_SLUG = 'water-tank-cleaning';
const OLD_CHILD_SLUG = 'water-tank-cleaning-tank-cleaning';

const HOME_CONTENT_REF_PATHS = [
  'banners.targetCategoryId',
  'promos.targetCategoryId',
  'noteworthy.targetCategoryId',
  'booked.targetCategoryId',
  'spotlight.targetCategoryId',
  'categorySections.seeAllTargetCategoryId',
  'categorySections.cards.targetCategoryId'
];

const countRefs = async (id) => ({
  brands: await Brand.countDocuments({ categoryIds: id, status: { $ne: 'deleted' } }),
  services: await UserService.countDocuments({ categoryId: id, status: { $ne: 'deleted' } }),
  activeBookings: await Booking.countDocuments({
    categoryId: id,
    status: { $nin: ['completed', 'cancelled', 'rejected'] }
  }),
  carts: await Cart.countDocuments({ 'items.categoryId': id }),
  coupons: await Coupon.countDocuments({ categories: id, isActive: true }),
  homeContent: await HomeContent.countDocuments({
    $or: HOME_CONTENT_REF_PATHS.map((p) => ({ [p]: id }))
  })
});

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);

  const cleaning = await Category.findOne({ slug: CLEANING_SLUG, parentId: null });
  if (!cleaning) throw new Error('Cleaning root category not found; aborting');

  const newSlug = buildSubCategorySlug(CLEANING_SLUG, 'Water Tank Cleaning');
  const oldRoot = await Category.findOne({ slug: OLD_ROOT_SLUG });
  let child = await Category.findOne({ slug: OLD_CHILD_SLUG });
  const alreadyMoved = await Category.findOne({ slug: newSlug });

  if (alreadyMoved && (!oldRoot || oldRoot.status === 'deleted')) {
    console.log('Already migrated; nothing to do.');
    return;
  }
  if (!child) throw new Error(`Sub-category ${OLD_CHILD_SLUG} not found; aborting`);
  if (!oldRoot) throw new Error(`Category ${OLD_ROOT_SLUG} not found; aborting`);
  if (child.status === 'deleted') throw new Error('Water tank sub-category is deleted; aborting');

  const rootRefs = await countRefs(oldRoot._id);
  const childRefs = await countRefs(child._id);
  console.log('Cleaning              :', cleaning._id.toString());
  console.log('Old root (to retire)  :', oldRoot._id.toString(), oldRoot.slug, 'refs', rootRefs);
  console.log('Sub-category (to move):', child._id.toString(), child.slug, '->', newSlug, 'refs', childRefs);

  // Brand / Cart / HomeContent refs are re-pointed below; anything else needs a human.
  const blocking = ['services', 'activeBookings', 'coupons'].filter((k) => rootRefs[k] > 0);
  if (blocking.length) {
    throw new Error(`Old root still referenced (${blocking.join(', ')}); resolve manually. Aborting.`);
  }

  const siblings = await Category.find({ parentId: cleaning._id, status: { $ne: 'deleted' } })
    .select('homeOrder')
    .lean();
  const nextOrder = siblings.reduce((m, s) => Math.max(m, s.homeOrder || 0), 0) + 1;

  console.log('Planned changes:');
  console.log(`  - sub-category: parentId -> Cleaning, slug -> ${newSlug}, homeOrder -> ${nextOrder}, inherit icon/eta/rating/bookings/hero from old root where empty`);
  console.log(`  - old root: status ${oldRoot.status} -> deleted (previousStatus=${oldRoot.status})`);
  console.log(`  - re-point old-root references to the sub-category: ${rootRefs.homeContent} HomeContent, ${rootRefs.brands} brand(s), ${rootRefs.carts} cart(s)`);

  if (!APPLY) {
    console.log('\nDry-run only. Re-run with --apply to write.');
    return;
  }

  // Backup everything we are about to touch.
  const homeDocs = await HomeContent.find({
    $or: HOME_CONTENT_REF_PATHS.map((p) => ({ [p]: oldRoot._id }))
  }).lean();
  const brandDocs = await Brand.find({ categoryIds: oldRoot._id }).lean();
  const cartDocs = await Cart.find({ 'items.categoryId': oldRoot._id }).lean();
  const backupDir = path.join(__dirname, 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `water-tank-under-cleaning-${Date.now()}.json`);
  fs.writeFileSync(
    backupFile,
    JSON.stringify({ oldRoot: oldRoot.toObject(), child: child.toObject(), homeContent: homeDocs, brands: brandDocs, carts: cartDocs }, null, 2)
  );
  console.log('Backup written:', backupFile);

  // 1. Move the sub-category.
  child.parentId = cleaning._id;
  child.slug = newSlug;
  child.homeOrder = nextOrder;
  child.showOnHome = true;
  if (!child.homeIconUrl && oldRoot.homeIconUrl) child.homeIconUrl = oldRoot.homeIconUrl;
  if (child.etaDefaultMinutes == null && oldRoot.etaDefaultMinutes != null) child.etaDefaultMinutes = oldRoot.etaDefaultMinutes;
  if (!child.displayRating && oldRoot.displayRating) child.displayRating = oldRoot.displayRating;
  if (!child.bookingsLabel && oldRoot.bookingsLabel) child.bookingsLabel = oldRoot.bookingsLabel;
  if (!(child.heroBanner && child.heroBanner.title) && oldRoot.heroBanner && oldRoot.heroBanner.title) {
    child.heroBanner = oldRoot.heroBanner;
  }
  await child.save();

  // 2. Re-point HomeContent references before the old root disappears.
  if (rootRefs.homeContent > 0) {
    for (const doc of homeDocs) {
      const raw = JSON.stringify(doc);
      const swapped = raw.split(oldRoot._id.toString()).join(child._id.toString());
      const next = JSON.parse(swapped);
      const $set = {};
      for (const key of ['banners', 'promos', 'noteworthy', 'booked', 'spotlight', 'categorySections']) {
        if (JSON.stringify(doc[key]) !== JSON.stringify(next[key])) $set[key] = next[key];
      }
      if (Object.keys($set).length) {
        // Cast ids back from strings the same way mongoose would on a normal write.
        const home = await HomeContent.findById(doc._id);
        for (const [k, v] of Object.entries($set)) home.set(k, v);
        await home.save();
      }
    }
  }

  // 2b. Brands and carts that pointed at the old root now point at the moved sub-category.
  for (const b of brandDocs) {
    const ids = b.categoryIds.map((c) => (String(c) === String(oldRoot._id) ? child._id : c));
    const unique = [...new Map(ids.map((c) => [String(c), c])).values()];
    const $set = { categoryIds: unique };
    if (String(b.categoryId) === String(oldRoot._id)) $set.categoryId = child._id;
    await Brand.collection.updateOne({ _id: b._id }, { $set });
  }
  await Cart.collection.updateMany(
    { 'items.categoryId': oldRoot._id },
    { $set: { 'items.$[i].categoryId': child._id } },
    { arrayFilters: [{ 'i.categoryId': oldRoot._id }] }
  );

  // 3. Retire the old top-level category (soft delete, restorable).
  oldRoot.previousStatus = oldRoot.status || 'active';
  oldRoot.status = 'deleted';
  await oldRoot.save();

  await invalidatePublicCatalogKeys().catch((e) => console.warn('Cache invalidation skipped:', e.message));
  console.log('Done.');
};

run()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    console.error('FAILED:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  });
