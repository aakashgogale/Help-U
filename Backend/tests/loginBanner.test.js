const assert = require('assert');
const LoginBanner = require('../models/LoginBanner');
const {
  DEFAULT_USER_BANNERS,
  DEFAULT_PARTNER_BANNERS
} = require('../controllers/publicControllers/loginBannerController');

console.log('\n--- Testing LoginBanner Model & Defaults ---');

// 1. Verify Default Banners exist and have required fields
assert(Array.isArray(DEFAULT_USER_BANNERS) && DEFAULT_USER_BANNERS.length > 0, 'User default banners should exist');
assert(Array.isArray(DEFAULT_PARTNER_BANNERS) && DEFAULT_PARTNER_BANNERS.length > 0, 'Partner default banners should exist');

for (const b of DEFAULT_USER_BANNERS) {
  assert.strictEqual(b.app, 'user', 'User banner app must be user');
  assert(b.title, 'User banner must have a title');
  assert(b.badge, 'User banner must have a badge');
}
console.log('  ✅ User default banners structure verified');

for (const b of DEFAULT_PARTNER_BANNERS) {
  assert.strictEqual(b.app, 'partner', 'Partner banner app must be partner');
  assert(b.title, 'Partner banner must have a title');
  assert(b.badge, 'Partner banner must have a badge');
}
console.log('  ✅ Partner default banners structure verified');

// 2. Validate LoginBanner Schema requirements
const bannerInstance = new LoginBanner({
  app: 'user',
  title: 'Test Offer',
  subtitle: 'Test Details',
  badge: 'NEW',
  gradient: 'emerald'
});

assert.strictEqual(bannerInstance.app, 'user');
assert.strictEqual(bannerInstance.title, 'Test Offer');
assert.strictEqual(bannerInstance.isActive, true);
assert.strictEqual(bannerInstance.order, 0);
console.log('  ✅ LoginBanner model instantiation and default fields verified');

// 3. Validate rejection of missing title
const invalidBanner = new LoginBanner({
  app: 'user'
});
const validationErr = invalidBanner.validateSync();
assert(validationErr && validationErr.errors['title'], 'Title should be required by LoginBanner schema');
console.log('  ✅ LoginBanner model correctly requires title');

// 4. Validate partner banner creation
const partnerBanner = new LoginBanner({
  app: 'partner',
  title: 'Earn 50k',
  gradient: 'purple'
});
assert.strictEqual(partnerBanner.app, 'partner');
assert.strictEqual(partnerBanner.gradient, 'purple');
console.log('  ✅ LoginBanner model supports partner app');

// 5. Validate master disable/enable feature flags
const { FLAG_DEFAULTS } = require('../utils/featureFlags');
const Settings = require('../models/Settings');

assert.strictEqual(FLAG_DEFAULTS.isUserLoginBannersEnabled, true, 'User login banners should default to enabled');
assert.strictEqual(FLAG_DEFAULTS.isPartnerLoginBannersEnabled, true, 'Partner login banners should default to enabled');
console.log('  ✅ Master disable/enable feature flags default to enabled');

const settingsInstance = new Settings({ type: 'global' });
assert.strictEqual(settingsInstance.isUserLoginBannersEnabled, true);
assert.strictEqual(settingsInstance.isPartnerLoginBannersEnabled, true);
console.log('  ✅ Settings schema supports isUserLoginBannersEnabled and isPartnerLoginBannersEnabled');

console.log('\nAll LoginBanner tests passed successfully! ✅\n');

