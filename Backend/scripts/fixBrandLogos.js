/**
 * One-off: give the brand sections that have no logo, or a logo that does not load, the closest
 * existing icon from the app's own /categories folder. The admin can replace any of them in
 * Categories > Brands. Only the iconUrl of these nine brands changes; a backup is written first.
 *   node scripts/fixBrandLogos.js [--apply] [--backup-dir=<dir>]
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const APPLY = process.argv.includes('--apply');
const backupArg = process.argv.find((a) => a.startsWith('--backup-dir='));
const DIR = backupArg ? backupArg.split('=')[1] : __dirname;

const ICONS = {
  'Home Pest Treatment': '/categories/cleaning.svg',
  'Gel & Acrylic Extensions': '/categories/nail-art.png',
  'Nail Art & Design': '/categories/nail-art.png',
  'Luxury Manicure Packages': '/categories/nail-art.png',
  'Wall Painting': '/categories/painting.png',
  'Plumbing & taps': '/categories/plumber-toilet.svg',
  'Carpentry & assembly': '/categories/carpenter-door.svg',
  'Head & body massage': '/categories/massage-men.svg',
  'Bike washing': '/categories/bike-wash.png'
};

const PUBLIC = path.join(__dirname, '..', '..', 'Frontend', 'public');

const run = async () => {
  for (const [title, icon] of Object.entries(ICONS)) {
    if (!fs.existsSync(path.join(PUBLIC, icon))) throw new Error(`icon file missing for "${title}": ${icon}`);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const col = mongoose.connection.db.collection('brands');
  const brands = await col.find({ title: { $in: Object.keys(ICONS) }, status: 'active' }).toArray();
  console.log(APPLY ? '=== APPLY ===' : '=== DRY RUN (no writes) ===');
  brands.forEach((b) => console.log(`  ${b.title.padEnd(26)} ${JSON.stringify(b.iconUrl)} -> ${ICONS[b.title]}`));
  console.log(`${brands.length} brand sections`);
  if (!APPLY) { console.log('\nNo changes written. Re-run with --apply.'); return; }
  const file = path.join(DIR, `brand-logos-backup-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(brands.map((b) => ({ _id: b._id, title: b.title, iconUrl: b.iconUrl })), null, 2));
  console.log(`\nBackup written: ${file}`);
  for (const b of brands) await col.updateOne({ _id: b._id }, { $set: { iconUrl: ICONS[b.title], updatedAt: new Date() } });
  console.log('Updated.');
};
run().then(() => process.exit(0)).catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
