/**
 * Migration: set `hasBrands = true` on every top-level Category that
 * currently has at least one Brand pointing to it.
 *
 * This keeps the pre-Phase-2 "appliances via brand" admin flow working
 * unchanged after the Phase-3 wizard ships (which uses `hasBrands` to
 * decide whether to show the Brand/Section step).
 *
 * Idempotent. Dry-run by default — no writes without --apply.
 *
 * Run:
 *   node Backend/scripts/migrateCategoryHasBrands.js             # dry-run (default)
 *   node Backend/scripts/migrateCategoryHasBrands.js --apply     # write
 *
 * Safe to re-run: a category whose Brand count is 0 is left as-is; a
 * category whose hasBrands is already true is skipped.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Brand = require('../models/Brand');

const migrateCategoryHasBrands = async ({ apply = false, silent = false } = {}) => {
  const log = (...args) => { if (!silent) console.log(...args); };
  const mode = apply ? 'APPLY' : 'DRY-RUN';
  log(`\n[migrate hasBrands] mode=${mode}\n`);

  // Only consider top-level categories; sub-categories never carry brands.
  const topLevel = await Category.find({ parentId: null }).select('_id title slug hasBrands').lean();
  log(`[migrate hasBrands] inspecting ${topLevel.length} top-level categories`);

  let scanned = 0;
  let willUpdate = 0;
  let skippedNoBrands = 0;
  let skippedAlreadyTrue = 0;
  let errors = 0;

  for (const cat of topLevel) {
    scanned++;
    try {
      const count = await Brand.countDocuments({ categoryIds: cat._id });
      if (count === 0) {
        skippedNoBrands++;
        continue;
      }
      if (cat.hasBrands === true) {
        skippedAlreadyTrue++;
        continue;
      }
      willUpdate++;
      log(`  [${apply ? 'write' : 'would-write'}] ${cat.title.padEnd(32)} slug=${cat.slug.padEnd(22)} brands=${count}`);
      if (apply) {
        await Category.updateOne({ _id: cat._id }, { $set: { hasBrands: true } });
      }
    } catch (err) {
      errors++;
      if (!silent) console.error(`  [error] ${cat.title}:`, err.message);
    }
  }

  log('\n[migrate hasBrands] summary');
  log(`  scanned:            ${scanned}`);
  log(`  updated:            ${willUpdate}  (${apply ? 'applied' : 'dry-run — nothing written'})`);
  log(`  skipped (no brands):${skippedNoBrands}`);
  log(`  skipped (already):  ${skippedAlreadyTrue}`);
  log(`  errors:             ${errors}`);
  if (!apply && !silent) log('\nRun again with --apply to persist these changes.');

  return { scanned, willUpdate, skippedNoBrands, skippedAlreadyTrue, errors };
};

if (require.main === module) {
  const APPLY = process.argv.includes('--apply');
  (async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('MONGODB_URI not set in environment');
      process.exit(1);
    }
    await mongoose.connect(uri);
    const result = await migrateCategoryHasBrands({ apply: APPLY });
    await mongoose.disconnect();
    process.exit(result.errors ? 1 : 0);
  })().catch(err => {
    console.error('[migrate hasBrands] fatal:', err);
    process.exit(1);
  });
}

module.exports = { migrateCategoryHasBrands };
