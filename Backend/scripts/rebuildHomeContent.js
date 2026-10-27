/**
 * One-off: replace the old demo home-page content with real, connected content.
 *
 * The home page's "Most booked", "Noteworthy" and card rows were typed-in demo text with made-up
 * prices pointing at categories and services that no longer exist. This rebuilds them from the live
 * catalog: every card links to a real service and the tile it lives in (the server then shows the
 * service's current price), banners and promos point at real categories, and typos are fixed.
 * The scrap promo, curated items and page switches are left as they are.
 *
 * All city copies of the home content are rebuilt the same way, including a city whose copy was empty.
 * Dry run by default; --apply writes, after saving a backup of every home content document.
 *   node scripts/rebuildHomeContent.js [--apply] [--backup-dir=<dir>]
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const APPLY = process.argv.includes('--apply');
const backupArg = process.argv.find((a) => a.startsWith('--backup-dir='));
const BACKUP_DIR = backupArg ? backupArg.split('=')[1] : __dirname;

// [exact service title, short title shown on the card]
const MOST_BOOKED = [
  ['5-Stage Mechanized Water Tank Cleaning (Up to 1000L)', 'Water tank cleaning'],
  ['Power Jet Service (Split AC)', 'Split AC power jet service'],
  ['Intense Bathroom Cleaning (1 Bathroom)', 'Bathroom deep cleaning'],
  ['Sofa Deep Cleaning (3 Seater)', 'Sofa deep cleaning'],
  ["Men's Precision Haircut & Styling", 'Haircut & styling'],
  ['Fan Repair (Capacitor / Regulator)', 'Fan repair'],
  ['Korean Glass Skin Ritual Facial', 'Korean glass skin facial']
];

const SECTIONS = [
  { title: 'Salon for Women', seeAll: "Women's Salon & Spa", cards: [
    ['Eyebrow & Upper Lip Threading', 'Eyebrow & upper lip threading'], ['Honey Waxing (Full Arms + Full Legs)', 'Honey waxing'],
    ['24K Pure Gold Radiance Facial', '24K gold radiance facial'], ['Signature Mani-Pedi Combo with Heel Peel', 'Mani-pedi combo']] },
  { title: 'Appliance Repair & Service', seeAll: 'AC & Appliance Repair', cards: [
    ['Power Jet Service (Split AC)', 'AC power jet service'], ['Complete AC Tune-Up & Jet Wash Combo', 'AC tune-up & jet wash'],
    ['Comprehensive RO Servicing', 'RO servicing'], ['Annual Washer Care & Descaling Combo', 'Washing machine care']] },
  { title: 'Electrical Services at Home', seeAll: 'Electrician, Plumber & Carpenter', cards: [
    ['Switch / Socket Replacement', 'Switch & socket replacement'], ['MCB / Fuse Replacement', 'MCB & fuse replacement'],
    ['Fan Repair (Capacitor / Regulator)', 'Fan repair'], ['Toilet Flush Tank Repair', 'Toilet flush tank repair']] },
  { title: 'Cleaning Essentials', seeAll: 'Cleaning', cards: [
    ['Intense Bathroom Cleaning (1 Bathroom)', 'Bathroom cleaning'], ['Kitchen Deep Cleaning', 'Kitchen deep cleaning'],
    ['Sofa Deep Cleaning (3 Seater)', 'Sofa cleaning'], ['Full Home Cockroach Treatment', 'Cockroach treatment']] },
  { title: "Men's Grooming", seeAll: "Men's Salon & Massage", cards: [
    ['Haircut + Beard Trim Combo', 'Haircut + beard trim'], ["Men's Precision Haircut & Styling", 'Precision haircut'],
    ['Beard Shaping & Styling', 'Beard shaping'], ['O3+ Instant Tan Removal Pack', 'Tan removal'] ] }
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const cats = await db.collection('categories').find({ status: 'active' }).toArray();
  const svcs = await db.collection('userservices').find({ status: 'active', publishStatus: { $ne: 'draft' } }).toArray();

  const cat = (title) => { const c = cats.find((x) => x.title === title); if (!c) throw new Error(`category "${title}" not found`); return c; };
  const svc = (title) => { const s = svcs.find((x) => x.title === title); if (!s) throw new Error(`service "${title}" not found`); return s; };
  const oid = (x) => new mongoose.Types.ObjectId(String(x._id));

  const card = (title, short, extra = {}) => {
    const s = svc(title);
    const c = cats.find((x) => String(x._id) === String(s.categoryId));
    const original = Number(s.originalPrice) || 0;
    const price = Number(s.basePrice) || 0;
    return {
      title: short, imageUrl: (s.images && s.images[0]) || s.iconUrl || '', badge: '',
      price: String(price), originalPrice: original > price ? String(original) : '',
      discount: original > price ? `${Math.round(((original - price) / original) * 100)}% OFF` : '',
      rating: s.displayRating ? String(s.displayRating) : '', reviews: s.reviewsLabel || '',
      targetCategoryId: oid(c), slug: c.slug, targetServiceId: oid(s), ...extra
    };
  };

  const booked = MOST_BOOKED.map(([t, short], i) => { const { badge, optionsCount, ...b } = card(t, short); return { ...b, order: i }; }); // eslint-disable-line no-unused-vars
  const categorySections = SECTIONS.map((sec, i) => ({
    title: sec.title, subtitle: '', seeAllTargetCategoryId: oid(cat(sec.seeAll)), seeAllSlug: cat(sec.seeAll).slug, seeAllTargetServiceId: null,
    cards: sec.cards.map(([t, short]) => card(t, short)), order: i
  }));

  const target = (title) => ({ targetCategoryId: oid(cat(title)), slug: cat(title).slug, targetServiceId: null });
  const retargetNoteworthy = (n) => {
    const t = n.title || '';
    if (/salon luxe/i.test(t)) return { ...n, ...target("Women's Salon & Spa") };
    if (/water purifier/i.test(t)) return { ...n, ...target('RO/Water Purifier') };
    if (/bathroom/i.test(t)) return { ...n, ...target('Bathroom & Kitchen Cleaning') };
    if (/hair studio/i.test(t)) {
      const s = svc("Men's Precision Haircut & Styling");
      return { ...n, title: 'Haircut & Grooming for Men', imageUrl: (s.images && s.images[0]) || n.imageUrl, ...target('Haircut & Grooming') };
    }
    return n;
  };
  const retargetPromo = (p) => {
    if (/ac repair/i.test(p.title || '')) return { ...p, ...target('AC') };
    if (/salon/i.test(p.title || '')) return { ...p, title: 'Salon service', ...target("Women's Salon & Spa") };
    return p; // Scrap and anything else stay as they are
  };
  const bannerTargets = ['Electrician, Plumber & Carpenter', 'Cleaning'];

  const docs = await db.collection('homecontents').find({}).toArray();
  console.log(APPLY ? '=== APPLY ===' : '=== DRY RUN (no writes) ===');
  console.log(`home content copies: ${docs.length}\n`);
  console.log('Most booked:'); booked.forEach((b) => console.log(`   ${b.title.padEnd(30)} ₹${b.price}${b.originalPrice ? ' (was ' + b.originalPrice + ')' : ''} -> ${cats.find((c) => String(c._id) === String(b.targetCategoryId)).title}`));
  categorySections.forEach((s) => {
    console.log(`\n${s.title}  (see all -> ${cats.find((c) => String(c._id) === String(s.seeAllTargetCategoryId)).title})`);
    s.cards.forEach((c) => console.log(`   ${c.title.padEnd(30)} ₹${c.price} -> ${cats.find((x) => String(x._id) === String(c.targetCategoryId)).title}`));
  });

  const updates = docs.map((d) => ({
    _id: d._id,
    set: {
      booked, categorySections,
      noteworthy: (d.noteworthy || []).map(retargetNoteworthy),
      promos: (d.promos || []).map(retargetPromo),
      banners: (d.banners || []).map((b, i) => (bannerTargets[i] ? { ...b, ...target(bannerTargets[i]) } : b)),
      updatedAt: new Date()
    }
  }));

  if (!APPLY) { console.log('\nNo changes written. Re-run with --apply.'); return; }
  const file = path.join(BACKUP_DIR, `home-content-backup-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(docs, null, 2));
  console.log(`\nBackup written: ${file}`);
  for (const u of updates) await db.collection('homecontents').updateOne({ _id: u._id }, { $set: u.set });
  console.log('All updates applied.');
};

run().then(() => process.exit(0)).catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
