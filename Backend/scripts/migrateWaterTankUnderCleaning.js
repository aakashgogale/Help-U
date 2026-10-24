/**
 * Consolidate "Water Tank Cleaning" under "Cleaning".
 *
 * Water Tank Cleaning is a service line of Cleaning, not a top-level category. The
 * target is the sub-category `cleaning-water-tank-cleaning` (parent: Cleaning). This
 * script works from whatever state the data is in (nothing moved yet, moved by hand in
 * the admin, or partly migrated) and makes it consistent:
 *
 *   1. ensures the target sub-category exists under Cleaning (moves the legacy
 *      `water-tank-cleaning-tank-cleaning` sub-category there if it was not moved yet);
 *   2. re-points everything that still references a legacy water-tank category
 *      (the old top-level one and its old sub-categories, including soft-deleted ones)
 *      to the target: live services, brands, carts, coupons and Home content;
 *      historical bookings are left untouched;
 *   3. soft-deletes the legacy top-level category (restorable, `previousStatus` kept)
 *      once it has no active children.
 *
 * Dry-run by default. Pass --apply to write. A JSON backup of every touched document
 * is written to scripts/backups/ first. Idempotent.
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
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');
const HomeContent = require('../models/HomeContent');
const { buildSubCategorySlug } = require('../utils/categorySlug');
const { invalidatePublicCatalogKeys } = require('../utils/catalogCache');

const APPLY = process.argv.includes('--apply');

const CLEANING_SLUG = 'cleaning';
const LEGACY_ROOT_SLUG = 'water-tank-cleaning';
const LEGACY_CHILD_SLUGS = ['water-tank-cleaning-tank-cleaning', 'water-tank-cleaning-water-tank-cleaning'];

const HOME_CONTENT_KEYS = ['banners', 'promos', 'noteworthy', 'booked', 'spotlight', 'categorySections'];
const HOME_CONTENT_REF_PATHS = [
  'banners.targetCategoryId',
  'promos.targetCategoryId',
  'noteworthy.targetCategoryId',
  'booked.targetCategoryId',
  'spotlight.targetCategoryId',
  'categorySections.seeAllTargetCategoryId',
  'categorySections.cards.targetCategoryId'
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);

  const cleaning = await Category.findOne({ slug: CLEANING_SLUG, parentId: null });
  if (!cleaning) throw new Error('Cleaning root category not found; aborting');

  const targetSlug = buildSubCategorySlug(CLEANING_SLUG, 'Water Tank Cleaning');
  const legacyRoot = await Category.findOne({ slug: LEGACY_ROOT_SLUG });
  const legacyChildren = await Category.find({ slug: { $in: LEGACY_CHILD_SLUGS } });

  let target = await Category.findOne({ slug: targetSlug });
  let moveLegacyChild = null;
  if (!target) {
    moveLegacyChild = legacyChildren.find((c) => c.status !== 'deleted');
    if (!moveLegacyChild) throw new Error(`No ${targetSlug} sub-category and no active legacy sub-category to move; aborting`);
    target = moveLegacyChild;
  }
  if (target.status === 'deleted') throw new Error('Target sub-category is deleted; aborting');

  const legacyIds = [
    ...(legacyRoot ? [legacyRoot._id] : []),
    ...legacyChildren.filter((c) => String(c._id) !== String(target._id)).map((c) => c._id)
  ];

  const services = await UserService.find({ categoryId: { $in: legacyIds }, status: { $ne: 'deleted' } }).lean();
  const brands = await Brand.find({ $or: [{ categoryIds: { $in: legacyIds } }, { categoryId: { $in: legacyIds } }] }).lean();
  const carts = await Cart.find({ 'items.categoryId': { $in: legacyIds } }).lean();
  const coupons = await Coupon.find({ categories: { $in: legacyIds } }).lean();
  const homeDocs = await HomeContent.find({
    $or: legacyIds.flatMap((id) => HOME_CONTENT_REF_PATHS.map((p) => ({ [p]: id })))
  }).lean();
  const activeLegacyChildren = legacyRoot
    ? await Category.countDocuments({ parentId: legacyRoot._id, status: { $ne: 'deleted' }, _id: { $ne: target._id } })
    : 0;

  console.log('Cleaning           :', cleaning._id.toString());
  console.log('Target sub-category:', target._id.toString(), target.slug, `(parent ${target.parentId || 'none'})`);
  console.log('Legacy categories  :', legacyIds.map(String).join(', ') || 'none');
  console.log('Plan:');
  if (moveLegacyChild) console.log(`  - move ${moveLegacyChild.slug} under Cleaning as ${targetSlug}`);
  console.log(`  - re-point ${services.length} live service(s), ${brands.length} brand(s), ${carts.length} cart(s), ${coupons.length} coupon(s), ${homeDocs.length} Home content doc(s)`);
  services.forEach((s) => console.log(`      service: ${s.title}`));
  if (legacyRoot && legacyRoot.status !== 'deleted') {
    console.log(activeLegacyChildren === 0
      ? `  - soft-delete legacy top-level category ${legacyRoot.slug}`
      : `  - legacy top-level category kept: it still has ${activeLegacyChildren} active child(ren)`);
  }

  const nothingToDo = !moveLegacyChild && !services.length && !brands.length && !carts.length &&
    !coupons.length && !homeDocs.length && (!legacyRoot || legacyRoot.status === 'deleted' || activeLegacyChildren > 0);
  if (nothingToDo) {
    console.log('Already consistent; nothing to do.');
    return;
  }
  if (!APPLY) {
    console.log('\nDry-run only. Re-run with --apply to write.');
    return;
  }

  // Backup everything we are about to touch.
  const backupDir = path.join(__dirname, 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `water-tank-under-cleaning-${Date.now()}.json`);
  fs.writeFileSync(
    backupFile,
    JSON.stringify({ target: target.toObject(), legacyRoot, legacyChildren, services, brands, carts, coupons, homeContent: homeDocs }, null, 2)
  );
  console.log('Backup written:', backupFile);

  // 1. Move the legacy sub-category if the target did not exist yet.
  if (moveLegacyChild) {
    const siblings = await Category.find({ parentId: cleaning._id, status: { $ne: 'deleted' } }).select('homeOrder').lean();
    target.parentId = cleaning._id;
    target.slug = targetSlug;
    target.homeOrder = siblings.reduce((m, s) => Math.max(m, s.homeOrder || 0), 0) + 1;
    target.showOnHome = true;
    await target.save();
  }

  // Fill gaps on the target from the legacy root so the catalog page keeps its look.
  if (legacyRoot) {
    if (!target.homeIconUrl && legacyRoot.homeIconUrl) target.homeIconUrl = legacyRoot.homeIconUrl;
    if (target.etaDefaultMinutes == null && legacyRoot.etaDefaultMinutes != null) target.etaDefaultMinutes = legacyRoot.etaDefaultMinutes;
    if (!target.displayRating && legacyRoot.displayRating) target.displayRating = legacyRoot.displayRating;
    if (!target.bookingsLabel && legacyRoot.bookingsLabel) target.bookingsLabel = legacyRoot.bookingsLabel;
    if (!(target.heroBanner && target.heroBanner.title) && legacyRoot.heroBanner && legacyRoot.heroBanner.title) {
      target.heroBanner = legacyRoot.heroBanner;
    }
    if (target.isModified()) await target.save();
  }

  const legacySet = new Set(legacyIds.map(String));
  const remap = (id) => (legacySet.has(String(id)) ? target._id : id);

  // 2. Re-point references (raw collection writes: no hooks, only the fields we mean to change).
  if (services.length) {
    await UserService.collection.updateMany(
      { _id: { $in: services.map((s) => s._id) } },
      { $set: { categoryId: target._id } }
    );
  }
  for (const b of brands) {
    const ids = (b.categoryIds || []).map(remap);
    const unique = [...new Map(ids.map((c) => [String(c), c])).values()];
    const $set = { categoryIds: unique };
    if (b.categoryId && legacySet.has(String(b.categoryId))) $set.categoryId = target._id;
    await Brand.collection.updateOne({ _id: b._id }, { $set });
  }
  for (const c of carts) {
    await Cart.collection.updateOne(
      { _id: c._id },
      { $set: { 'items.$[i].categoryId': target._id } },
      { arrayFilters: [{ 'i.categoryId': { $in: legacyIds } }] }
    );
  }
  for (const c of coupons) {
    const ids = (c.categories || []).map(remap);
    const unique = [...new Map(ids.map((x) => [String(x), x])).values()];
    await Coupon.collection.updateOne({ _id: c._id }, { $set: { categories: unique } });
  }
  for (const doc of homeDocs) {
    let swapped = JSON.stringify(doc);
    legacyIds.forEach((id) => { swapped = swapped.split(String(id)).join(String(target._id)); });
    const next = JSON.parse(swapped);
    const home = await HomeContent.findById(doc._id);
    for (const key of HOME_CONTENT_KEYS) {
      if (JSON.stringify(doc[key]) !== JSON.stringify(next[key])) home.set(key, next[key]);
    }
    await home.save();
  }

  // 3. Retire the legacy top-level category (soft delete, restorable).
  if (legacyRoot && legacyRoot.status !== 'deleted' && activeLegacyChildren === 0) {
    legacyRoot.previousStatus = legacyRoot.status || 'active';
    legacyRoot.status = 'deleted';
    await legacyRoot.save();
  }

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
