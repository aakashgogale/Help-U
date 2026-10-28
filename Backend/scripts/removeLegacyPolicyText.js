/**
 * One-off: the global Settings record still holds three long policy texts from before the Legal Pages
 * were built (`privacyPolicy`, `userPolicy`, `vendorPolicy`, still written for "Homester"). Nothing reads
 * them any more (the policy pages are edited under Legal Pages) and the Settings model does not define
 * them, so this only removes the leftover fields. A backup of the three texts is written first.
 *
 *   node scripts/removeLegacyPolicyText.js [--apply] [--backup-dir=<dir>]
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const FIELDS = ['privacyPolicy', 'userPolicy', 'vendorPolicy'];
const APPLY = process.argv.includes('--apply');
const backupArg = process.argv.find((a) => a.startsWith('--backup-dir='));
const DIR = backupArg ? backupArg.split('=')[1] : __dirname;

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const col = mongoose.connection.db.collection('settings');
  const doc = await col.findOne({ type: 'global' });
  if (!doc) { console.log('No global settings record.'); return; }

  const present = FIELDS.filter((f) => doc[f] !== undefined);
  console.log(APPLY ? '=== APPLY ===' : '=== DRY RUN (no writes) ===');
  console.log(`leftover policy fields on the global settings record: ${present.length ? present.join(', ') : 'none'}`);
  present.forEach((f) => console.log(`   ${f}: ${String(doc[f]).length} characters, starts "${String(doc[f]).slice(0, 50).replace(/\n/g, ' ')}"`));
  if (!present.length) return;
  if (!APPLY) { console.log('\nNo changes written. Re-run with --apply.'); return; }

  const file = path.join(DIR, `legacy-policy-text-backup-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(Object.fromEntries(present.map((f) => [f, doc[f]])), null, 2));
  console.log('backup written:', file);
  const r = await col.updateOne({ _id: doc._id }, { $unset: Object.fromEntries(present.map((f) => [f, ''])) });
  console.log(`removed ${present.length} field(s) (matched ${r.matchedCount}, modified ${r.modifiedCount})`);
};
run().then(() => mongoose.disconnect()).catch((e) => { console.error(e); process.exit(1); });
