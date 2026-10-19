/**
 * Validators Test Suite
 * Tests validateSubCategorySlug, subCategorySlugError, and normaliseVariants
 * Run: node Backend/tests/validators.test.js
 */

const assert = require('assert');
const { validateSubCategorySlug, subCategorySlugError } = require('../utils/categorySlug');
const { normaliseVariants } = require('../controllers/adminControllers/serviceController');

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${desc}:`, err.message);
    failed++;
  }
}

console.log('\n--- 1. Testing validateSubCategorySlug ---');

it('rejects empty parent slug', () => {
  const res = validateSubCategorySlug('', 'salon-waxing');
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.reason, 'parent-required');
  assert.strictEqual(typeof subCategorySlugError(res.reason), 'string');
});

it('rejects empty child slug', () => {
  const res = validateSubCategorySlug('salon', '');
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.reason, 'slug-required');
});

it('rejects malformed child slug with invalid characters', () => {
  const res = validateSubCategorySlug('salon', 'salon_waxing');
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.reason, 'bad-format');
});

it('rejects child slug equal to parent slug', () => {
  const res = validateSubCategorySlug('salon', 'salon');
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.reason, 'equals-parent');
});

it('rejects child slug missing parent prefix', () => {
  const res = validateSubCategorySlug('salon', 'spa-waxing');
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.reason, 'missing-prefix');
  assert.strictEqual(subCategorySlugError(res.reason, { parentSlug: 'salon' }).includes('salon-'), true);
});

it('rejects child slug with empty suffix after parent prefix', () => {
  const res = validateSubCategorySlug('salon', 'salon-');
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.reason, 'bad-format');
});

it('accepts correctly namespaced child slug', () => {
  const res = validateSubCategorySlug('salon', 'salon-waxing');
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.reason, undefined);
});

it('accepts multi-segment child slug with prefix', () => {
  const res = validateSubCategorySlug('ac-repair', 'ac-repair-split-ac-service');
  assert.strictEqual(res.ok, true);
});

console.log('\n--- 2. Testing normaliseVariants ---');

it('handles undefined input (no change)', () => {
  const res = normaliseVariants(undefined);
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.variants, undefined);
});

it('handles null input (clear all variants)', () => {
  const res = normaliseVariants(null);
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.variants, []);
});

it('handles empty array', () => {
  const res = normaliseVariants([]);
  assert.strictEqual(res.ok, true);
  assert.deepStrictEqual(res.variants, []);
});

it('rejects non-array input', () => {
  const res = normaliseVariants('not-an-array');
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.error, 'variants must be an array');
});

it('rejects variant with missing or empty title', () => {
  const res = normaliseVariants([{ price: 100 }]);
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.error, 'variant[0].title is required');
});

it('rejects duplicate variant titles (case-insensitive)', () => {
  const res = normaliseVariants([
    { title: 'Standard', price: 100 },
    { title: 'standard', price: 200 }
  ]);
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.error, 'Duplicate variant title: "standard"');
});

it('rejects negative variant price', () => {
  const res = normaliseVariants([{ title: 'Standard', price: -50 }]);
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.error, 'variant[0].price must be >= 0');
});

it('rejects invalid variant pricingType', () => {
  const res = normaliseVariants([{ title: 'Standard', price: 100, pricingType: 'crypto' }]);
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.error.includes('pricingType must be one of'), true);
});

it('rejects when no variant is active', () => {
  const res = normaliseVariants([
    { title: 'Standard', price: 100, isActive: false },
    { title: 'Premium', price: 200, isActive: false }
  ]);
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.error, 'At least one variant must be active');
});

it('normalises valid variants array with defaults', () => {
  const res = normaliseVariants([
    {
      title: '  Basic Package  ',
      price: '199',
      originalPrice: '299',
      durationMinutes: '45',
      pricingType: 'fixed',
      inclusions: ['Clean filter', 'Check gas'],
      imageUrl: 'http://example.com/basic.png',
      order: 1
    },
    {
      title: 'Deep Clean',
      price: 499,
      isActive: true,
      order: 2
    }
  ]);

  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.variants.length, 2);
  assert.strictEqual(res.variants[0].title, 'Basic Package');
  assert.strictEqual(res.variants[0].price, 199);
  assert.strictEqual(res.variants[0].originalPrice, 299);
  assert.strictEqual(res.variants[0].durationMinutes, 45);
  assert.deepStrictEqual(res.variants[0].inclusions, ['Clean filter', 'Check gas']);
  assert.strictEqual(res.variants[0].isActive, true);
  assert.strictEqual(res.variants[0].order, 1);
  assert.strictEqual(res.variants[1].title, 'Deep Clean');
  assert.strictEqual(res.variants[1].price, 499);
  assert.strictEqual(res.variants[1].isActive, true);
});

console.log(`\nValidators Test Result: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
