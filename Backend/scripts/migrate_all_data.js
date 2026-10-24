const mongoose = require('mongoose');

// Connection strings come from the environment, never from the source code:
//   SOURCE_MONGODB_URI=...  TARGET_MONGODB_URI=...  node scripts/migrate_all_data.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const SOURCE_URI = process.env.SOURCE_MONGODB_URI;
const TARGET_URI = process.env.TARGET_MONGODB_URI;
if (!SOURCE_URI || !TARGET_URI) {
  console.error('Set SOURCE_MONGODB_URI and TARGET_MONGODB_URI before running this migration.');
  process.exit(1);
}

async function migrateData() {
  console.log('🚀 Starting Full Database Migration...');
  console.log(`Source DB: Homster`);
  console.log(`Target DB: ServerProvider\n`);

  let sourceConn;
  let targetConn;

  try {
    sourceConn = await mongoose.createConnection(SOURCE_URI, {
      serverSelectionTimeoutMS: 20000
    }).asPromise();
    console.log('✅ Connected to Source DB (Homster)');

    targetConn = await mongoose.createConnection(TARGET_URI, {
      serverSelectionTimeoutMS: 20000
    }).asPromise();
    console.log('✅ Connected to Target DB (ServerProvider)\n');

    const collections = await sourceConn.db.listCollections().toArray();
    console.log(`Found ${collections.length} collections in source DB.\n`);

    const summary = [];

    for (const col of collections) {
      const colName = col.name;
      if (colName.startsWith('system.')) continue;

      try {
        const sourceCollection = sourceConn.db.collection(colName);
        const targetCollection = targetConn.db.collection(colName);

        const docs = await sourceCollection.find({}).toArray();
        if (!docs || docs.length === 0) {
          summary.push({ collection: colName, count: 0, status: 'Empty' });
          continue;
        }

        console.log(`📦 Migrating "${colName}" (${docs.length} documents)...`);

        // Clear target collection first so we don't have schema/index collisions
        await targetCollection.deleteMany({});

        // Insert all documents in batches of 200
        const batchSize = 200;
        let inserted = 0;
        for (let i = 0; i < docs.length; i += batchSize) {
          const batch = docs.slice(i, i + batchSize);
          try {
            await targetCollection.insertMany(batch, { ordered: false });
            inserted += batch.length;
          } catch (batchErr) {
            // Even if some failed, count inserted
            if (batchErr.result && batchErr.result.nInserted) {
              inserted += batchErr.result.nInserted;
            } else if (batchErr.insertedDocs) {
              inserted += batchErr.insertedDocs.length;
            }
            console.warn(`  ⚠️ Warning on batch insert for "${colName}":`, batchErr.message);
          }
        }

        console.log(`  ✅ Successfully copied ${inserted}/${docs.length} docs for "${colName}"`);
        summary.push({ collection: colName, count: inserted, status: 'Success' });
      } catch (colErr) {
        console.error(`  ❌ Error migrating collection "${colName}":`, colErr.message);
        summary.push({ collection: colName, count: 0, status: `Failed: ${colErr.message}` });
      }
    }

    console.log('\n========================================');
    console.log('🎉 FULL MIGRATION COMPLETE!');
    console.log('========================================');
    console.table(summary);

  } catch (error) {
    console.error('❌ Migration connection failed:', error);
  } finally {
    if (sourceConn) await sourceConn.close();
    if (targetConn) await targetConn.close();
    console.log('\n🔒 Connections closed.');
  }
}

migrateData();
