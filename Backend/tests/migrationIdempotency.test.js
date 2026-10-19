/**
 * Migration Idempotency Test Suite
 * Tests migrateCategoryHasBrands (dry-run, apply, re-run idempotency)
 * Run: node Backend/tests/migrationIdempotency.test.js
 */

require('dotenv').config();
const assert = require('assert');
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const { migrateCategoryHasBrands } = require('../scripts/migrateCategoryHasBrands');

let passed = 0;
let failed = 0;

async function it(desc, fn) {
  try {
    await fn();
    console.log(`  ✅ ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${desc}:`, err.message);
    failed++;
  }
}

(async () => {
  console.log('\n--- Testing Migration Idempotency (migrateCategoryHasBrands) ---');
  await mongoose.connect(process.env.MONGODB_URI);

  const catWithBrandId = new mongoose.Types.ObjectId();
  const catWithoutBrandId = new mongoose.Types.ObjectId();
  const brandId = new mongoose.Types.ObjectId();

  try {
    // Setup test categories
    await Category.create([
      {
        _id: catWithBrandId,
        title: 'Migration Test Cat With Brands',
        slug: `mig-cat-brands-${Date.now()}`,
        parentId: null,
        hasBrands: false
      },
      {
        _id: catWithoutBrandId,
        title: 'Migration Test Cat No Brands',
        slug: `mig-cat-nobrands-${Date.now()}`,
        parentId: null,
        hasBrands: false
      }
    ]);

    await Brand.create({
      _id: brandId,
      title: 'Migration Test Brand',
      slug: `mig-brand-${Date.now()}`,
      categoryIds: [catWithBrandId]
    });

    await it('dry-run mode does not modify hasBrands in database', async () => {
      const dryResult = await migrateCategoryHasBrands({ apply: false, silent: true });
      assert.strictEqual(dryResult.errors, 0);
      assert.strictEqual(dryResult.willUpdate >= 1, true);

      // Verify category in DB was NOT changed
      const cat = await Category.findById(catWithBrandId).lean();
      assert.strictEqual(cat.hasBrands, false);
    });

    await it('apply mode sets hasBrands: true for categories with brands', async () => {
      const applyResult = await migrateCategoryHasBrands({ apply: true, silent: true });
      assert.strictEqual(applyResult.errors, 0);

      // Verify category in DB WAS updated
      const cat = await Category.findById(catWithBrandId).lean();
      assert.strictEqual(cat.hasBrands, true);

      // Verify category without brands remained false
      const noBrandCat = await Category.findById(catWithoutBrandId).lean();
      assert.strictEqual(noBrandCat.hasBrands, false);
    });

    await it('re-running migration is completely idempotent (0 willUpdate, 0 errors)', async () => {
      const secondRun = await migrateCategoryHasBrands({ apply: true, silent: true });
      assert.strictEqual(secondRun.errors, 0);
      assert.strictEqual(secondRun.willUpdate, 0);
      assert.strictEqual(secondRun.skippedAlreadyTrue >= 1, true);

      // State is still identical
      const cat = await Category.findById(catWithBrandId).lean();
      assert.strictEqual(cat.hasBrands, true);
    });

  } finally {
    // Cleanup
    await Category.deleteMany({ _id: { $in: [catWithBrandId, catWithoutBrandId] } });
    await Brand.deleteOne({ _id: brandId });
    await mongoose.disconnect();
  }

  console.log(`\nMigration Idempotency Test Result: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  process.exit(0);
})().catch(err => {
  console.error('Fatal error in migration test:', err);
  process.exit(1);
});
