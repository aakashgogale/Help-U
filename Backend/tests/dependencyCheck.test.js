/**
 * Dependency Check Test Suite
 * Tests buildDependencyReport for accurate reference counts
 * Run: node Backend/tests/dependencyCheck.test.js
 */

require('dotenv').config();
const assert = require('assert');
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const UserService = require('../models/UserService');
const Coupon = require('../models/Coupon');
const { buildDependencyReport } = require('../controllers/adminControllers/categoryController');

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
  console.log('\n--- Testing Dependency Check (buildDependencyReport) ---');
  await mongoose.connect(process.env.MONGODB_URI);

  const testCatId = new mongoose.Types.ObjectId();
  const testSubCatId = new mongoose.Types.ObjectId();
  const testBrandId = new mongoose.Types.ObjectId();
  const testServiceId = new mongoose.Types.ObjectId();
  const testCouponId = new mongoose.Types.ObjectId();

  try {
    await it('reports hasDependencies: false for an isolated category', async () => {
      const isolatedId = new mongoose.Types.ObjectId();
      const report = await buildDependencyReport(isolatedId);
      assert.strictEqual(report.hasDependencies, false);
      assert.strictEqual(report.childCategories, 0);
      assert.strictEqual(report.brands, 0);
      assert.strictEqual(report.services, 0);
      assert.strictEqual(report.activeBookings, 0);
      assert.strictEqual(report.activeCarts, 0);
      assert.strictEqual(report.coupons, 0);
      assert.strictEqual(report.homeContentReferences, 0);
    });

    // Create linked documents
    await Category.create([
      {
        _id: testCatId,
        title: 'Dep Test Cat',
        slug: `dep-test-${Date.now()}`,
        parentId: null
      },
      {
        _id: testSubCatId,
        title: 'Dep Test SubCat',
        slug: `dep-test-sub-${Date.now()}`,
        parentId: testCatId
      }
    ]);

    await Brand.create({
      _id: testBrandId,
      title: 'Dep Test Brand',
      slug: `dep-brand-${Date.now()}`,
      categoryIds: [testCatId]
    });

    await UserService.create({
      _id: testServiceId,
      title: 'Dep Test Service',
      brandId: testBrandId,
      categoryId: testCatId,
      basePrice: 100
    });

    await Coupon.create({
      _id: testCouponId,
      code: `DEPTEST${Date.now()}`,
      title: 'Dep Test Coupon',
      discountType: 'fixed',
      discountValue: 50,
      validUntil: new Date(Date.now() + 86400000),
      categories: [testCatId],
      isActive: true
    });

    await it('accurately counts childCategories, brands, services, and couponRefs', async () => {
      const report = await buildDependencyReport(testCatId);
      assert.strictEqual(report.hasDependencies, true);
      assert.strictEqual(report.childCategories, 1);
      assert.strictEqual(report.brands, 1);
      assert.strictEqual(report.services, 1);
      assert.strictEqual(report.coupons, 1);
      assert.strictEqual(typeof report.activeBookings, 'number');
      assert.strictEqual(typeof report.activeCarts, 'number');
      assert.strictEqual(typeof report.homeContentReferences, 'number');
    });

  } finally {
    // Cleanup
    await Category.deleteMany({ _id: { $in: [testCatId, testSubCatId] } });
    await Brand.deleteOne({ _id: testBrandId });
    await UserService.deleteOne({ _id: testServiceId });
    await Coupon.deleteOne({ _id: testCouponId });
    await mongoose.disconnect();
  }

  console.log(`\nDependency Check Test Result: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  process.exit(0);
})().catch(err => {
  console.error('Fatal error in dependency test:', err);
  process.exit(1);
});
