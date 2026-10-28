/**
 * One-off: soft-delete services that can never be shown or booked because their category is deleted
 * or missing (the removed "Dish washer" and "car-wash-home" categories, and one service with no
 * category). They are already invisible; this removes them from counts, searches and the admin list.
 * Nothing is erased: status becomes 'deleted' (as the admin delete button does), after a backup.
 * A service that a cart, plan, coupon, add-on or past booking points at is still only soft-deleted,
 * so those references keep resolving.
 *
 *   node scripts/retireOrphanServices.js [--apply] [--backup-dir=<dir>]
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const APPLY = process.argv.includes('--apply');
const backupArg = process.argv.find((a) => a.startsWith('--backup-dir='));
const DIR = backupArg ? backupArg.split('=')[1] : __dirname;

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const cats = await db.collection('categories').find({}).project({ title: 1, status: 1 }).toArray();
  const byId = new Map(cats.map((c) => [String(c._id), c]));
  const live = await db.collection('userservices').find({ status: { $ne: 'deleted' } }).toArray();

  const orphans = live.filter((s) => { const c = byId.get(String(s.categoryId)); return !c || c.status !== 'active'; });
  const groups = {};
  orphans.forEach((s) => { const c = byId.get(String(s.categoryId)); const k = c ? `${c.title} (${c.status})` : 'no category'; groups[k] = (groups[k] || 0) + 1; });

  console.log(APPLY ? '=== APPLY ===' : '=== DRY RUN (no writes) ===');
  console.log(`services whose category is deleted or missing: ${orphans.length}`);
  Object.entries(groups).forEach(([k, n]) => console.log(`   ${n} x ${k}`));

  const ids = orphans.map((s) => s._id);
  const inCarts = await db.collection('carts').countDocuments({ 'items.serviceId': { $in: ids } });
  const inBookings = await db.collection('bookings').countDocuments({ serviceId: { $in: ids } });
  console.log(`referenced by carts: ${inCarts}, by past bookings: ${inBookings} (soft delete keeps them readable)`);
  if (inCarts) throw new Error('a cart still holds one of these services; clear it first');
  if (!APPLY) { console.log('\nNo changes written. Re-run with --apply.'); return; }

  const file = path.join(DIR, `orphan-services-backup-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(orphans, null, 2));
  console.log(`\nBackup written: ${file}`);
  const res = await db.collection('userservices').updateMany({ _id: { $in: ids } }, { $set: { status: 'deleted', updatedAt: new Date() } });
  console.log(`Soft-deleted ${res.modifiedCount} of ${orphans.length}.`);
};
run().then(() => process.exit(0)).catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
