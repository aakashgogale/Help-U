/**
 * One-off: bring every city's home content in line with the default copy for the rows a city copy
 * may be missing (banners, promos, curated, noteworthy, spotlight and the show/hide switches).
 * One city copy was created empty, so its customers saw a partly blank home page. Only fields that
 * differ from the default copy are changed, and a backup of each touched document is written first.
 *   node scripts/repairCityHomeContent.js [--apply] [--backup-dir=<dir>]
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const APPLY = process.argv.includes('--apply');
const backupArg = process.argv.find((a) => a.startsWith('--backup-dir='));
const DIR = backupArg ? backupArg.split('=')[1] : __dirname;

const FIELDS = ['banners', 'promos', 'curated', 'noteworthy', 'booked', 'categorySections', 'spotlight',
  'isBannersVisible', 'isPromosVisible', 'isCuratedVisible', 'isNoteworthyVisible', 'isBookedVisible',
  'isCategorySectionsVisible', 'isCategoriesVisible', 'isSpotlightVisible', 'homeCategoryLimit', 'showAllServicesTile', 'allServicesLabel', 'isScrapVisible'];
const same = (a, b) => JSON.stringify(a, (k, v) => (k === '_id' ? undefined : v)) === JSON.stringify(b, (k, v) => (k === '_id' ? undefined : v));

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const col = mongoose.connection.db.collection('homecontents');
  const docs = await col.find({}).toArray();
  const base = docs.find((d) => !d.cityId);
  if (!base) throw new Error('default home content (no city) not found');

  const plan = [];
  docs.filter((d) => d.cityId).forEach((d) => {
    const set = {};
    FIELDS.forEach((f) => { if (base[f] !== undefined && !same(base[f], d[f])) set[f] = base[f]; });
    if (Object.keys(set).length) plan.push({ doc: d, set });
  });
  console.log(APPLY ? '=== APPLY ===' : '=== DRY RUN (no writes) ===');
  console.log(`${docs.length} copies; ${plan.length} differ from the default`);
  plan.forEach((p) => console.log(`   city ${p.doc.cityId}: ${Object.keys(p.set).join(', ')}`));
  if (!APPLY || !plan.length) { if (!APPLY) console.log('\nNo changes written. Re-run with --apply.'); return; }

  const file = path.join(DIR, `home-content-city-backup-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(plan.map((p) => p.doc), null, 2));
  console.log(`\nBackup written: ${file}`);
  for (const p of plan) await col.updateOne({ _id: p.doc._id }, { $set: { ...p.set, updatedAt: new Date() } });
  console.log('Updated.');
};
run().then(() => process.exit(0)).catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
