/**
 * Nesting Rules Test Suite
 * Tests validateParentId (depth limits, self-parenting, cyclic trees)
 * Run: node Backend/tests/nestingRules.test.js
 */

require('dotenv').config();
const assert = require('assert');
const mongoose = require('mongoose');
const Category = require('../models/Category');
const { validateParentId } = require('../controllers/adminControllers/categoryController');

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
  console.log('\n--- Testing Nesting Rules (validateParentId) ---');
  await mongoose.connect(process.env.MONGODB_URI);

  const testTopId = new mongoose.Types.ObjectId();
  const testSubId = new mongoose.Types.ObjectId();
  const testGrandChildId = new mongoose.Types.ObjectId();

  try {
    // Setup test categories
    await Category.create([
      {
        _id: testTopId,
        title: 'Test Root Category',
        slug: `test-root-${Date.now()}`,
        parentId: null,
        status: 'active'
      },
      {
        _id: testSubId,
        title: 'Test Sub Category',
        slug: `test-sub-${Date.now()}`,
        parentId: testTopId,
        status: 'active'
      }
    ]);

    await it('allows null / undefined parentId (top-level category)', async () => {
      const resNull = await validateParentId({ parentId: null });
      assert.strictEqual(resNull, null);

      const resUndef = await validateParentId({ parentId: undefined });
      assert.strictEqual(resUndef, null);

      const resStrNull = await validateParentId({ parentId: 'null' });
      assert.strictEqual(resStrNull, null);
    });

    await it('rejects category being its own parent', async () => {
      const res = await validateParentId({ categoryId: testTopId, parentId: testTopId });
      assert.strictEqual(res, 'A category cannot be its own parent.');
    });

    await it('rejects non-existent parentId', async () => {
      const nonExistent = new mongoose.Types.ObjectId();
      const res = await validateParentId({ parentId: nonExistent });
      assert.strictEqual(res, 'Parent category not found.');
    });

    await it('allows valid top-level category as parent', async () => {
      const res = await validateParentId({ categoryId: testGrandChildId, parentId: testTopId });
      assert.strictEqual(res, null);
    });

    await it('rejects nesting deeper than 2 levels (parent cannot itself have a parent)', async () => {
      // testSubId already has parent testTopId, so proposing testSubId as parent should fail
      const res = await validateParentId({ categoryId: testGrandChildId, parentId: testSubId });
      assert.strictEqual(
        res,
        'Nesting deeper than 2 levels is not allowed. The parent must itself be a top-level category.'
      );
    });

    await it('rejects cyclic parenting where proposed parent is already a child', async () => {
      // testSubId is already child of testTopId. Trying to make testTopId's parent testSubId:
      const res = await validateParentId({ categoryId: testTopId, parentId: testSubId });
      // either depth limit or cyclic:
      assert.strictEqual(typeof res, 'string');
      assert.strictEqual(res.length > 0, true);
    });

  } finally {
    // Cleanup test categories
    await Category.deleteMany({ _id: { $in: [testTopId, testSubId, testGrandChildId] } });
    await mongoose.disconnect();
  }

  console.log(`\nNesting Rules Test Result: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  process.exit(0);
})().catch(err => {
  console.error('Fatal error in nesting test:', err);
  process.exit(1);
});
