/**
 * Move base64 work photos out of Booking documents and into Cloudinary.
 *
 * Older completions stored the photos as data URLs inside the booking, which made single bookings
 * several megabytes and slowed every query that loaded them. This uploads each data URL to
 * Cloudinary and replaces it with the hosted URL (same { url, type, uploadedAt } shape).
 *
 * Dry-run by default. --apply writes. Before any change the original `workPhotos` of every touched
 * booking is saved to scripts/backups/. Idempotent: bookings with no data URLs are skipped.
 *
 *   node scripts/migrateWorkPhotosToCloudinary.js           # report only
 *   node scripts/migrateWorkPhotosToCloudinary.js --apply   # upload + write
 *   node scripts/migrateWorkPhotosToCloudinary.js --apply --booking BK123   # only that booking
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Booking = require('../models/Booking');
const { persistWorkPhotos } = require('../utils/workPhotos');
const { invalidatePublicCatalogKeys } = require('../utils/catalogCache');

const APPLY = process.argv.includes('--apply');
const onlyIdx = process.argv.indexOf('--booking');
const ONLY_BOOKING = onlyIdx > -1 ? process.argv[onlyIdx + 1] : null;

const isDataUrl = (photo) => {
  const url = typeof photo === 'string' ? photo : photo?.url;
  return typeof url === 'string' && url.startsWith('data:');
};

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);

  const col = Booking.collection;
  const candidates = await col.find({ 'workPhotos.0': { $exists: true } }, { projection: { bookingNumber: 1, workPhotos: 1 } }).toArray();
  const affected = candidates
    .filter((b) => (b.workPhotos || []).some(isDataUrl))
    .filter((b) => !ONLY_BOOKING || b.bookingNumber === ONLY_BOOKING);

  if (affected.length === 0) {
    console.log('No bookings with base64 work photos. Nothing to do.');
    return;
  }

  for (const b of affected) {
    const inline = b.workPhotos.filter(isDataUrl);
    const kb = Math.round(Buffer.byteLength(JSON.stringify(b.workPhotos)) / 1024);
    console.log(`${b.bookingNumber}: ${inline.length} base64 photo(s) of ${b.workPhotos.length}, ${kb} KB inline`);
  }

  if (!APPLY) {
    console.log('\nDry-run only. Re-run with --apply to upload and update.');
    return;
  }

  const backupDir = path.join(__dirname, 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `work-photos-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(affected, null, 2));
  console.log('Backup written:', backupFile);

  for (const b of affected) {
    const migrated = await persistWorkPhotos(b.workPhotos); // throws if any upload fails: nothing is written then
    await col.updateOne({ _id: b._id }, { $set: { workPhotos: migrated } });
    const kb = Math.round(Buffer.byteLength(JSON.stringify(migrated)) / 1024);
    console.log(`${b.bookingNumber}: ${migrated.length} photo(s) now hosted, ${kb} KB inline`);
    migrated.forEach((p) => console.log('   ', p.url));
  }

  await invalidatePublicCatalogKeys().catch(() => {});
  console.log('Done.');
};

run()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    console.error('FAILED:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  });
