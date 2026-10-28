/**
 * One-off: bookings used to keep the customer's payment code in two fields. Now only
 * `customerConfirmationOTP` is written. For bookings still holding a code in the old `paymentOtp`
 * field, copy it across when the main field is empty, then remove the old field. Both fields hold the
 * same value (or the main one is empty), so no code changes for any customer. A backup of the touched
 * bookings' code fields is written first.
 *
 *   node scripts/mergePaymentCodeFields.js [--apply] [--backup-dir=<dir>]
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
  const col = mongoose.connection.db.collection('bookings');
  const withOld = await col.find({ paymentOtp: { $exists: true } }).project({ paymentOtp: 1, customerConfirmationOTP: 1, status: 1 }).toArray();
  const toCopy = withOld.filter((b) => b.paymentOtp && !b.customerConfirmationOTP);
  const disagree = withOld.filter((b) => b.paymentOtp && b.customerConfirmationOTP && b.paymentOtp !== b.customerConfirmationOTP);

  console.log(APPLY ? '=== APPLY ===' : '=== DRY RUN (no writes) ===');
  console.log(`bookings that still have the old paymentOtp field: ${withOld.length}`);
  console.log(`  code only in the old field (will be copied across): ${toCopy.length}`);
  console.log(`  both fields hold DIFFERENT codes (main one wins, nothing lost from the backup): ${disagree.length}`);
  if (!APPLY) { console.log('\nNo changes written. Re-run with --apply.'); return; }
  if (!withOld.length) { console.log('Nothing to do.'); return; }

  const file = path.join(DIR, `payment-code-fields-backup-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(withOld, null, 2));
  console.log('backup written:', file);
  for (const b of toCopy) await col.updateOne({ _id: b._id, customerConfirmationOTP: { $in: [null, ''] } }, { $set: { customerConfirmationOTP: b.paymentOtp } });
  const r = await col.updateMany({ paymentOtp: { $exists: true } }, { $unset: { paymentOtp: '' } });
  console.log(`copied ${toCopy.length}, removed the old field from ${r.modifiedCount}`);
};
run().then(() => mongoose.disconnect()).catch((e) => { console.error(e); process.exit(1); });
