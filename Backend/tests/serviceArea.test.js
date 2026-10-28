/**
 * Partner service area: a partner's own radius from his home address, controlled by the admin.
 * Covers the rule (utils/serviceArea.js), the real partner search (services/locationService.js) on an in-memory
 * MongoDB, and the profile validation. Never touches the real database. Run: node tests/serviceArea.test.js
 */
process.env.JWT_SECRET = 'x'; process.env.JWT_REFRESH_SECRET = 'y';
const path = require('path');
const R = path.join(__dirname, '..') + path.sep;
const mongoose = require(R + 'node_modules/mongoose');
const { MongoMemoryServer } = require(R + 'node_modules/mongodb-memory-server');
const Worker = require(R + 'models/Worker');
const Settings = require(R + 'models/Settings');
const { invalidateBookingConfigCache } = require(R + 'utils/bookingConfig');
const SA = require(R + 'utils/serviceArea');
const { findNearbyWorkers } = require(R + 'services/locationService');

let ok = 0, bad = 0;
const check = (name, cond, extra = '') => { cond ? ok++ : bad++; console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`); };

// A point `km` kilometres north of the customer
const CUSTOMER = { lat: 22.7196, lng: 75.8577 };
const north = (km) => ({ lat: CUSTOMER.lat + km / 111.32, lng: CUSTOMER.lng });

const on = { isWorkerServiceRadiusEnabled: true, workerServiceRadiusMinKm: 2, workerServiceRadiusMaxKm: 15 };

(async () => {
  console.log('\n== the rule ==');
  const w = (km, range) => ({ address: { ...north(km) }, settings: { serviceRange: range } });
  check('feature off -> nobody has a personal radius', SA.personalRadiusKm(w(3, 10), { isWorkerServiceRadiusEnabled: false }) === null);
  check('nothing chosen -> the platform radius applies', SA.personalRadiusKm(w(3, null), on) === null && SA.personalRadiusKm(w(3, undefined), on) === null);
  check('chosen radius is used', SA.personalRadiusKm(w(3, 10), on) === 10);
  check('no saved home location -> the platform radius applies', SA.personalRadiusKm({ settings: { serviceRange: 10 }, address: {} }, on) === null && SA.personalRadiusKm({ settings: { serviceRange: 10 }, address: { lat: 0, lng: 0 } }, on) === null);
  check('a radius above the admin maximum is held at the maximum', SA.personalRadiusKm(w(3, 30), on) === 15);
  check('a radius below the admin minimum is raised to the minimum', SA.personalRadiusKm(w(3, 1), on) === 2);
  check('inside / outside the partner\'s own area', SA.insideOwnArea(w(8, 10), CUSTOMER, on) === true && SA.insideOwnArea(w(12, 10), CUSTOMER, on) === false && SA.insideOwnArea(w(8, null), CUSTOMER, on) === null);
  check('the distance maths is right (10 km north is about 10 km)', Math.abs(SA.distanceKm(CUSTOMER, north(10)) - 10) < 0.1);

  console.log('\n== saving a radius ==');
  check('feature off -> whatever is sent is ignored', SA.validateServiceRadius(8, { isWorkerServiceRadiusEnabled: false }).action === 'ignore');
  check('nothing sent -> untouched', SA.validateServiceRadius(undefined, on).action === 'ignore');
  check('empty or null -> cleared (platform radius)', SA.validateServiceRadius('', on).action === 'clear' && SA.validateServiceRadius(null, on).action === 'clear');
  check('a valid radius is saved, rounded to 0.1', (() => { const r = SA.validateServiceRadius('7.26', on); return r.action === 'set' && r.value === 7.3; })());
  check('below the minimum is refused with the limits in the message', (() => { const r = SA.validateServiceRadius(1, on); return r.action === 'error' && /2 and 15/.test(r.message); })());
  check('above the maximum is refused', SA.validateServiceRadius(40, on).action === 'error');
  check('text is refused', SA.validateServiceRadius('far', on).action === 'error');

  console.log('\n== the real partner search ==');
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Worker.init();
  let n = 0;
  const mk = (name, homeKm, liveKm, over = {}) => {
    n += 1;
    const home = north(homeKm); const live = north(liveKm === undefined ? homeKm : liveKm);
    return {
      name, email: `w${n}@t.com`, phone: `95000000${String(n).padStart(2, '0')}`, password: 'x', service: ['AC Repair'], categories: ['AC Repair'],
      aadhar: { number: '1', document: 'd', backDocument: 'd' }, pan: { number: 'A', document: 'd' },
      approvalStatus: 'approved', isActive: true, isOnline: true, address: { city: 'Indore', lat: home.lat, lng: home.lng },
      geoLocation: { type: 'Point', coordinates: [live.lng, live.lat] }, wallet: { dues: 0, cashLimit: 5000 }, ...over
    };
  };
  await Worker.create([
    mk('W1 plain, 3 km', 3, 3),
    mk('W2 radius 10, home 8 km (live outside platform radius)', 8, 8, { settings: { serviceRange: 10 } }),
    mk('W3 radius 2, home 3 km (narrower than platform)', 3, 3, { settings: { serviceRange: 2 } }),
    mk('W4 radius 10, home 20 km', 20, 20, { settings: { serviceRange: 10 } }),
    mk('W5 radius 10, home 30 km but traveling near the customer', 30, 2, { settings: { serviceRange: 10 } }),
    mk('W6 radius 10 but no home location', 8, 8, { settings: { serviceRange: 10 }, address: { city: 'Indore' } }),
    mk('W7 radius 30 (held at 15), home 12 km', 12, 12, { settings: { serviceRange: 30 } }),
    mk('W8 radius 30 (held at 15), home 20 km', 20, 20, { settings: { serviceRange: 30 } }),
    mk('W9 offline, radius 10, home 8 km', 8, 8, { isOnline: false, settings: { serviceRange: 10 } }),
    mk('W10 other service, radius 10, home 8 km', 8, 8, { service: ['Plumbing'], categories: ['Plumbing'], settings: { serviceRange: 10 } }),
    mk('W11 over cash limit, radius 10, home 8 km', 8, 8, { wallet: { dues: 9000, cashLimit: 5000 }, settings: { serviceRange: 10 } })
  ]);
  const setConfig = async (o) => { await Settings.deleteMany({}); await Settings.create({ type: 'global', ...o }); invalidateBookingConfigCache(); };
  const names = async (filters = {}) => (await findNearbyWorkers(CUSTOMER, 5, { service: 'AC Repair', checkCashLimit: true, ...filters })).map((x) => x.name.split(' ')[0]).sort();

  await setConfig({ isWorkerServiceRadiusEnabled: false });
  let got = await names();
  check('switch OFF: only the platform radius (5 km) decides; personal radii are ignored', got.join(',') === 'W1,W3,W5', got.join(','));

  await setConfig({ isWorkerServiceRadiusEnabled: true, workerServiceRadiusMinKm: 2, workerServiceRadiusMaxKm: 15 });
  got = await names();
  check('switch ON: partners with no radius still use the platform radius (W1)', got.includes('W1'));
  check('a partner whose own area covers the customer is found even though he is outside the platform radius (W2)', got.includes('W2'));
  check('a partner with a smaller own radius than the distance is left out (W3)', !got.includes('W3'));
  check('a customer beyond the partner\'s radius from home -> not found (W4)', !got.includes('W4'));
  check('a partner who is traveling near the customer but lives 30 km away is not found (W5)', !got.includes('W5'));
  check('radius chosen but no saved home location -> platform radius; he is outside it, so not found (W6)', !got.includes('W6'));
  check('a radius above the admin maximum is held at the maximum: 12 km is inside 15 (W7)', got.includes('W7'));
  check('...and 20 km is still outside it (W8)', !got.includes('W8'));
  check('an offline partner is not found for an instant job (W9)', !got.includes('W9'));
  check('the service filter still applies to partners found by service area (W10)', !got.includes('W10'));
  check('the cash-limit filter still applies to partners found by service area (W11)', !got.includes('W11'));
  check('nobody is listed twice', new Set(got).size === got.length, got.join(','));
  check('the exact set is W1, W2, W7', got.join(',') === 'W1,W2,W7', got.join(','));

  got = await names({ includeOffline: true });
  check('a scheduled job also reaches offline partners whose area covers it (W9)', got.includes('W9'));

  const found = await findNearbyWorkers(CUSTOMER, 5, { service: 'AC Repair' });
  const w2 = found.find((x) => x.name.startsWith('W2'));
  check('a partner found by service area carries his distance for ranking', w2 && Math.abs(w2.distance - 8) < 0.2 && w2.viaServiceArea === true, w2 && String(w2.distance));

  await setConfig({ isWorkerServiceRadiusEnabled: true, workerServiceRadiusMinKm: 2, workerServiceRadiusMaxKm: 9 });
  got = await names();
  check('the admin lowering the maximum to 9 km narrows partners at once (W7 home 12 km now out)', !got.includes('W7') && got.includes('W2'), got.join(','));

  console.log(`\nRESULT: ${ok} passed, ${bad} failed`);
  await mongoose.disconnect(); await mongod.stop();
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
