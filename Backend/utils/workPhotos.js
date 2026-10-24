/**
 * Work Photos
 *
 * Booking.workPhotos used to be a plain array of URL strings. It now stores
 * { url, type: 'before' | 'after' } so the apps can show before and after shots
 * separately.
 *
 * Bookings created before that change still hold strings, so both shapes are
 * handled here instead of migrating the collection: a bare string is treated as
 * an 'after' photo, which is what those uploads were — proof of completed work.
 */

const VALID_TYPES = ['before', 'after'];

/**
 * Accepts whatever the client or the database hands over and returns a clean
 * array of { url, type, uploadedAt }. Entries without a usable URL are dropped.
 */
const normalizeWorkPhotos = (photos) => {
  if (!photos) return [];
  if (!Array.isArray(photos)) return [];

  return photos
    .map((photo) => {
      // Legacy shape: a bare URL string.
      if (typeof photo === 'string') {
        const url = photo.trim();
        return url ? { url, type: 'after', uploadedAt: null } : null;
      }

      if (photo && typeof photo === 'object') {
        const url = String(photo.url ?? '').trim();
        if (!url) return null;

        const type = VALID_TYPES.includes(photo.type) ? photo.type : 'after';
        return {
          url,
          type,
          uploadedAt: photo.uploadedAt || null
        };
      }

      return null;
    })
    .filter(Boolean);
};

/**
 * Splits normalized photos into the two groups the UI renders.
 */
const splitWorkPhotos = (photos) => {
  const normalized = normalizeWorkPhotos(photos);
  return {
    before: normalized.filter((p) => p.type === 'before'),
    after: normalized.filter((p) => p.type === 'after')
  };
};

/**
 * normalizeWorkPhotos + guarantees nothing heavy is stored on the booking.
 *
 * The worker app captures photos as data URLs (base64 text). Saved as-is, one booking became
 * a 7.6 MB document that every query loading it had to transfer. Any data URL is uploaded to
 * Cloudinary here and replaced by its URL. If an upload fails this throws, so the caller can
 * ask the worker to retry instead of silently losing the proof photo or storing base64.
 */
const persistWorkPhotos = async (photos) => {
  const { uploadFile } = require('../services/cloudinaryService');
  const normalized = normalizeWorkPhotos(photos);

  return Promise.all(
    normalized.map(async (photo) => {
      if (!photo.url.startsWith('data:')) return photo;
      const result = await uploadFile(photo.url, { folder: 'helpu/work-photos', resource_type: 'image' });
      if (!result?.success || !result.url) {
        throw new Error('Work photo upload failed');
      }
      return { ...photo, url: result.url };
    })
  );
};

module.exports = { normalizeWorkPhotos, persistWorkPhotos, splitWorkPhotos, VALID_TYPES };
