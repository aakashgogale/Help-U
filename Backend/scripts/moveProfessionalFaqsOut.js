/**
 * One-off: remove the six professional questions that were mixed into the customer FAQ.
 * They already exist in the Professional FAQ ("worker-faq"); a question is only removed from the
 * customer FAQ when an identical question is found there. Backs up the page first.
 *   node scripts/moveProfessionalFaqsOut.js [--apply] [--backup-dir=<dir>]
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const APPLY = process.argv.includes('--apply');
const backupArg = process.argv.find((a) => a.startsWith('--backup-dir='));
const DIR = backupArg ? backupArg.split('=')[1] : __dirname;

const QUESTIONS = [
  'How do I start getting booking requests?', 'Why did I not get a booking request?', 'How do I get paid?',
  'What is the cash limit?', 'How do I complete a job?', 'What happens if I cancel a booking?'
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const col = mongoose.connection.db.collection('legalpages');
  const customer = await col.findOne({ slug: 'faq' });
  const worker = await col.findOne({ slug: 'worker-faq' });
  if (!customer || !worker) throw new Error('faq or worker-faq page not found');
  const workerQs = new Set((worker.faqs || []).map((f) => f.question));

  const remove = QUESTIONS.filter((q) => (customer.faqs || []).some((f) => f.question === q));
  const missing = remove.filter((q) => !workerQs.has(q));
  if (missing.length) throw new Error(`not in the Professional FAQ, so not removed: ${missing.join(' | ')}`);

  const kept = (customer.faqs || []).filter((f) => !remove.includes(f.question)).map((f, i) => ({ ...f, order: i }));
  console.log(APPLY ? '=== APPLY ===' : '=== DRY RUN (no writes) ===');
  console.log(`customer FAQ: ${customer.faqs.length} questions -> ${kept.length}; removing ${remove.length}:`);
  remove.forEach((q) => console.log('   -', q));
  if (!APPLY) { console.log('\nNo changes written. Re-run with --apply.'); return; }

  const file = path.join(DIR, `faq-backup-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(customer, null, 2));
  console.log(`\nBackup written: ${file}`);
  await col.updateOne({ _id: customer._id }, { $set: { faqs: kept, updatedAt: new Date() } });
  console.log('Updated.');
};
run().then(() => process.exit(0)).catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
