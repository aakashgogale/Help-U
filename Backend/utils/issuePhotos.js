/**
 * Issue Media
 *
 * Optional photos and short videos a customer attaches at checkout so the
 * worker can see the problem before accepting. The app uploads each file
 * first (see uploadIssuePhoto / uploadIssueVideo) and sends only the resulting
 * URLs with the booking.
 *
 * The admin chooses the actual limits (Settings.maxIssuePhotos and
 * Settings.maxIssueVideos); the constants below are hard ceilings that the
 * schema enforces whatever the settings say.
 */

const MAX_ISSUE_PHOTOS = 10;
const MAX_ISSUE_VIDEOS = 3;

// Only URLs from our own Cloudinary account are kept, so a client cannot attach
// arbitrary external links to a booking that workers will open.
const isOwnCloudinaryUrl = (url, resourceType) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return false;
  return url.startsWith(`https://res.cloudinary.com/${cloudName}/${resourceType}/upload/`);
};

const sanitize = (list, resourceType, limit) => {
  if (!Array.isArray(list)) return [];

  const urls = list
    .filter((p) => typeof p === 'string')
    .map((p) => p.trim())
    .filter((url) => isOwnCloudinaryUrl(url, resourceType));

  return [...new Set(urls)].slice(0, Math.max(0, limit));
};

/**
 * Returns a clean, de-duplicated array of at most `limit` image URLs.
 * Anything that is not one of our Cloudinary image URLs is dropped.
 */
const sanitizeIssuePhotos = (photos, limit = 5) =>
  sanitize(photos, 'image', Math.min(limit, MAX_ISSUE_PHOTOS));

/**
 * Same as sanitizeIssuePhotos for Cloudinary video URLs.
 */
const sanitizeIssueVideos = (videos, limit = 1) =>
  sanitize(videos, 'video', Math.min(limit, MAX_ISSUE_VIDEOS));

module.exports = {
  MAX_ISSUE_PHOTOS,
  MAX_ISSUE_VIDEOS,
  isOwnCloudinaryUrl,
  sanitizeIssuePhotos,
  sanitizeIssueVideos
};
