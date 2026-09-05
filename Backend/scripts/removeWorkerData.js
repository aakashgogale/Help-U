/**
 * One-time cleanup: removes all Worker data from the database.
 *
 * Dry run (default, reads only):  node scripts/removeWorkerData.js
 * Apply (destructive):           node scripts/removeWorkerData.js --apply
 */
require('dotenv').config();
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  console.log(`Connected to: ${db.databaseName}`);
  console.log(APPLY ? '>>> APPLY MODE (destructive)\n' : '>>> DRY RUN (no changes)\n');

  const collections = (await db.listCollections().toArray()).map(c => c.name);

  // 1. workers collection
  if (collections.includes('workers')) {
    const n = await db.collection('workers').countDocuments();
    console.log(`workers collection: ${n} documents -> DROP`);
    if (APPLY) await db.collection('workers').drop();
  } else {
    console.log('workers collection: not present');
  }

  // 2. field removals
  const fieldPlan = [
    ['bookings', ['workerId', 'workerResponse', 'workerAcceptedAt', 'workerPaymentStatus',
                  'isWorkerPaid', 'workerPaidAt', 'workerNotes']],
    ['reviews', ['workerId']],
    ['transactions', ['workerId']],
    ['notifications', ['workerId']]
  ];

  for (const [coll, fields] of fieldPlan) {
    if (!collections.includes(coll)) { console.log(`${coll}: not present`); continue; }
    const filter = { $or: fields.map(f => ({ [f]: { $exists: true } })) };
    const n = await db.collection(coll).countDocuments(filter);
    console.log(`${coll}: ${n} documents carry worker fields -> $unset ${fields.join(', ')}`);
    if (APPLY && n > 0) {
      const unset = Object.fromEntries(fields.map(f => [f, '']));
      const res = await db.collection(coll).updateMany(filter, { $unset: unset });
      console.log(`  modified ${res.modifiedCount}`);
    }
  }

  // 3. worker-only documents
  const docPlan = [
    ['transactions', { type: 'worker_payment' }],
    ['notifications', { type: { $in: ['worker_assigned', 'worker_started', 'worker_completed'] } }],
    ['notifications', { relatedType: 'worker' }]
  ];

  for (const [coll, filter] of docPlan) {
    if (!collections.includes(coll)) continue;
    const n = await db.collection(coll).countDocuments(filter);
    console.log(`${coll}: ${n} worker-only documents (${JSON.stringify(filter)}) -> DELETE`);
    if (APPLY && n > 0) {
      const res = await db.collection(coll).deleteMany(filter);
      console.log(`  deleted ${res.deletedCount}`);
    }
  }

  // 4. stale indexes on removed fields
  for (const coll of ['bookings', 'reviews', 'transactions', 'notifications']) {
    if (!collections.includes(coll)) continue;
    const indexes = await db.collection(coll).indexes();
    for (const idx of indexes) {
      if (Object.keys(idx.key).some(k => k.startsWith('worker'))) {
        console.log(`${coll}: index ${idx.name} -> DROP`);
        if (APPLY) await db.collection(coll).dropIndex(idx.name);
      }
    }
  }

  console.log(APPLY ? '\nDone. Worker data removed.' : '\nDry run complete. Re-run with --apply to perform the deletions.');
  await mongoose.disconnect();
};

run().catch(async (e) => {
  console.error('Cleanup failed:', e.message);
  await mongoose.disconnect();
  process.exit(1);
});
