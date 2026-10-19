/**
 * Public Catalog Endpoint Test Suite
 * Tests GET /api/public/categories/:idOrSlug/catalog
 * Run: node Backend/tests/publicCatalog.test.js
 */

require('dotenv').config();
const assert = require('assert');
const axios = require('axios');
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const UserService = require('../models/UserService');
const Coupon = require('../models/Coupon');

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

const API_BASE = 'http://localhost:5000/api/public';

(async () => {
  console.log('\n--- Testing GET /api/public/categories/:idOrSlug/catalog ---');
  await mongoose.connect(process.env.MONGODB_URI);

  const testCatId = new mongoose.Types.ObjectId();
  const testSubCatId = new mongoose.Types.ObjectId();
  const testBrandId = new mongoose.Types.ObjectId();
  const testServiceId = new mongoose.Types.ObjectId();
  const catCouponId = new mongoose.Types.ObjectId();
  const globalCouponId = new mongoose.Types.ObjectId();

  const slug = `cat-test-${Date.now()}`;

  try {
    // 1. Create test category with hero banner
    await Category.create([
      {
        _id: testCatId,
        title: 'Catalog Test Category',
        slug,
        parentId: null,
        status: 'active',
        publishStatus: 'published',
        displayRating: '4.9',
        bookingsLabel: '10k+ booked',
        etaDefaultMinutes: 25,
        heroBanner: {
          tag: 'TRENDING',
          title: 'Special Home Care',
          startingPrice: '₹149',
          imageUrl: 'http://example.com/hero.jpg'
        }
      },
      {
        _id: testSubCatId,
        title: 'Catalog Test SubCategory',
        slug: `${slug}-sub`,
        parentId: testCatId,
        status: 'active',
        publishStatus: 'published',
        subCategoryBadge: '20% OFF',
        sortOrder: 1
      }
    ]);

    // 2. Create Brand (section)
    await Brand.create({
      _id: testBrandId,
      title: 'Catalog Test Section',
      slug: `sec-test-${Date.now()}`,
      categoryIds: [testCatId],
      status: 'active',
      displayOrder: 1,
      bannerPromo: {
        title: 'Promo Title',
        subtitle: 'Promo Subtitle',
        originalPrice: 499,
        imageUrl: 'http://example.com/promo.jpg'
      }
    });

    // 3. Create Service with variants
    await UserService.create({
      _id: testServiceId,
      title: 'Catalog Test Service',
      brandId: testBrandId,
      categoryId: testCatId,
      basePrice: 199,
      status: 'active',
      publishStatus: 'published',
      sortOrder: 1,
      variants: [
        {
          title: 'Inactive Variant',
          price: 99,
          isActive: false,
          order: 1
        },
        {
          title: 'Variant B',
          price: 299,
          isActive: true,
          order: 2
        },
        {
          title: 'Variant A',
          price: 199,
          isActive: true,
          order: 1
        }
      ]
    });

    // 4. Create Coupons (one category-specific, one global)
    const now = new Date();
    await Coupon.create([
      {
        _id: globalCouponId,
        code: `GLOBAL${Date.now()}`,
        title: 'Global 100 Off',
        discountType: 'fixed',
        discountValue: 100,
        validFrom: new Date(now.getTime() - 60000),
        validUntil: new Date(now.getTime() + 86400000),
        categories: [],
        isAutoApply: true,
        isActive: true
      },
      {
        _id: catCouponId,
        code: `CATSPEC${Date.now()}`,
        title: 'Category 50 Off Auto',
        discountType: 'fixed',
        discountValue: 50,
        validFrom: new Date(now.getTime() - 60000),
        validUntil: new Date(now.getTime() + 86400000),
        categories: [testCatId],
        isAutoApply: true,
        isActive: true
      }
    ]);

    await it('returns 404 for unknown category slug', async () => {
      try {
        await axios.get(`${API_BASE}/categories/non-existent-slug-xyz/catalog`);
        assert.fail('Should have returned 404');
      } catch (err) {
        assert.strictEqual(err.response?.status, 404);
        assert.strictEqual(err.response?.data?.success, false);
      }
    });

    await it('fetches full catalog payload by slug', async () => {
      const res = await axios.get(`${API_BASE}/categories/${slug}/catalog`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);

      // Category & Hero verification
      assert.strictEqual(res.data.category.title, 'Catalog Test Category');
      assert.strictEqual(res.data.category.slug, slug);
      assert.strictEqual(res.data.hero.tag, 'TRENDING');
      assert.strictEqual(res.data.hero.title, 'Special Home Care');
      assert.strictEqual(res.data.hero.startingPrice, '₹149');
      assert.strictEqual(res.data.hero.imageUrl, 'http://example.com/hero.jpg');

      // Best Coupon verification (Category-specific coupon wins over global despite lower discountValue)
      assert.strictEqual(!!res.data.bestCoupon, true);
      assert.strictEqual(res.data.bestCoupon.code.startsWith('CATSPEC'), true);
      assert.strictEqual(res.data.bestCoupon.discountValue, 50);

      // SubCategories verification
      assert.strictEqual(Array.isArray(res.data.subCategories), true);
      assert.strictEqual(res.data.subCategories.length, 1);
      assert.strictEqual(res.data.subCategories[0].title, 'Catalog Test SubCategory');
      assert.strictEqual(res.data.subCategories[0].badge, '20% OFF');

      // Sections verification
      assert.strictEqual(Array.isArray(res.data.sections), true);
      assert.strictEqual(res.data.sections.length >= 1, true);

      const section = res.data.sections.find(s => s._id === testBrandId.toString());
      assert.strictEqual(!!section, true);
      assert.strictEqual(section.title, 'Catalog Test Section');
      assert.strictEqual(section.bannerPromo?.title, 'Promo Title');

      // Services verification
      assert.strictEqual(Array.isArray(section.services), true);
      const svc = section.services.find(s => s._id === testServiceId.toString());
      assert.strictEqual(!!svc, true);
      assert.strictEqual(svc.title, 'Catalog Test Service');

      // Variants verification (Inactive filtered out, ordered by variant.order)
      assert.strictEqual(Array.isArray(svc.variants), true);
      assert.strictEqual(svc.variants.length, 2);
      assert.strictEqual(svc.variants[0].title, 'Variant A');
      assert.strictEqual(svc.variants[0].order, 1);
      assert.strictEqual(svc.variants[1].title, 'Variant B');
      assert.strictEqual(svc.variants[1].order, 2);
    });

    await it('fetches full catalog payload by category ID', async () => {
      const res = await axios.get(`${API_BASE}/categories/${testCatId.toString()}/catalog`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.category.slug, slug);
    });

    await it('serves cached response on second request', async () => {
      const t1 = Date.now();
      const res1 = await axios.get(`${API_BASE}/categories/${slug}/catalog`);
      const elapsed1 = Date.now() - t1;

      const t2 = Date.now();
      const res2 = await axios.get(`${API_BASE}/categories/${slug}/catalog`);
      const elapsed2 = Date.now() - t2;

      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res2.data.category.slug, slug);
    });

  } finally {
    // Cleanup
    await Category.deleteMany({ _id: { $in: [testCatId, testSubCatId] } });
    await Brand.deleteOne({ _id: testBrandId });
    await UserService.deleteOne({ _id: testServiceId });
    await Coupon.deleteMany({ _id: { $in: [catCouponId, globalCouponId] } });
    await mongoose.disconnect();
  }

  console.log(`\nPublic Catalog Test Result: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  process.exit(0);
})().catch(err => {
  console.error('Fatal error in public catalog test:', err);
  process.exit(1);
});
