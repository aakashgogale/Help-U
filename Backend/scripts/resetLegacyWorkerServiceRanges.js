/**
 * Reset legacy hardcoded worker service ranges to null (optional / platform default).
 *
 * Background:
 * Prior to the "Partner Service Area" feature, all workers were automatically seeded
 * or updated with settings.serviceRange = 5 (the global search radius).
 * In the new architecture, settings.serviceRange = null means "use the platform search radius",
 * while a number indicates a deliberate custom choice by the partner.
 *
 * Usage:
 *   node scripts/resetLegacyWorkerServiceRanges.js           (Dry run - preview only)
 *   node scripts/resetLegacyWorkerServiceRanges.js --apply   (Applies updates to MongoDB)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const apply = process.argv.includes('--apply');

(async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in .env');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log(' Connected to MongoDB');

    const db = mongoose.connection.db;
    const vendors = db.collection('vendors');

    // Find all workers with legacy default 5 or 10 km
    const countWithRange = await vendors.countDocuments({ 'settings.serviceRange': { $ne: null } });
    const legacyWorkers = await vendors.find({
      'settings.serviceRange': { $in: [5, 10] }
    }).project({ name: 1, phone: 1, 'settings.serviceRange': 1 }).toArray();

    console.log(`\nFound ${countWithRange} workers with serviceRange set.`);
    console.log(`Found ${legacyWorkers.length} workers with legacy default serviceRange (5 or 10 km).`);

    if (legacyWorkers.length === 0) {
      console.log('✅ No legacy worker service ranges to reset.');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('\nWorkers to be reset to null (platform default):');
    legacyWorkers.forEach((w) => {
      console.log(`  - ${w.name || 'Unnamed'} (${w.phone || 'No phone'}): ${w.settings?.serviceRange} km -> null`);
    });

    if (!apply) {
      console.log('\nℹ️ DRY RUN ONLY. No changes made to database.');
      console.log('To apply changes, run:');
      console.log('  node scripts/resetLegacyWorkerServiceRanges.js --apply\n');
    } else {
      const result = await vendors.updateMany(
        { 'settings.serviceRange': { $in: [5, 10] } },
        { $set: { 'settings.serviceRange': null } }
      );
      console.log(`\n✅ Successfully updated ${result.modifiedCount} worker(s) to null (platform default).`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
})();

