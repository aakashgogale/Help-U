/**
 * One-off: clear the typed "cancellation policy" sentence stored on each service.
 *
 * The server enforces one platform policy (Booking Configuration > Cancellation Policy), so a
 * per-service sentence such as "Free cancellation up to 24 hours before..." could only contradict
 * what is actually charged. Service pages now show a line built from the live settings instead.
 * Each service's old text is saved to the backup so it can be restored.
 *
 *   node scripts/clearServiceCancellationText.js [--apply] [--backup-dir=<dir>]
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const APPLY = process.argv.includes('--apply');
const backupArg = process.argv.find((a) => a.startsWith('--backup-dir='));
const BACKUP_DIR = backupArg ? backupArg.split('=')[1] : __dirname;

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const col = mongoose.connection.db.collection('userservices');
  const rows = await col.find({ cancellationPolicy: { $exists: true, $nin: ['', null] } }).project({ title: 1, status: 1, cancellationPolicy: 1 }).toArray();

  const groups = {};
  rows.forEach((r) => { groups[r.cancellationPolicy] = (groups[r.cancellationPolicy] || 0) + 1; });
  console.log(APPLY ? '=== APPLY ===' : '=== DRY RUN (no writes) ===');
  console.log(`services with their own cancellation text: ${rows.length}`);
  Object.entries(groups).sort((a, b) => b[1] - a[1]).forEach(([text, n]) => console.log(`  ${String(n).padStart(4)} x ${JSON.stringify(text)}`));
  if (!APPLY) { console.log('\nNo changes written. Re-run with --apply.'); return; }

  const file = path.join(BACKUP_DIR, `service-cancellation-text-backup-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(rows.map((r) => ({ _id: r._id, title: r.title, cancellationPolicy: r.cancellationPolicy })), null, 2));
  console.log(`\nBackup written: ${file}`);
  const res = await col.updateMany({ _id: { $in: rows.map((r) => r._id) } }, { $set: { cancellationPolicy: '' } });
  console.log(`Cleared ${res.modifiedCount} of ${rows.length}.`);
};
run().then(() => process.exit(0)).catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
