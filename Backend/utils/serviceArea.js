/**
 * Partner service area: how far from his own home address a partner will travel for jobs.
 *
 * The rule, in one place so matching, the "pro arrives in X mins" badges and the profile save all agree:
 *  - It only exists while the admin has switched it on (Booking Config -> Partner service area).
 *  - It is optional for each partner. Empty = the partner uses the platform search radius, as before.
 *  - It is measured from the partner's saved home address (address.lat / address.lng), not from where he
 *    happens to be right now. A partner with no saved map location uses the platform radius.
 *  - The partner's own radius replaces the platform radius for him. It can be larger or smaller, but the
 *    admin's minimum and maximum always bound it (if the admin later lowers the maximum, it is clamped).
 *
 * Pure functions only: no database, no Express.
 */

const EARTH_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;

const validPoint = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

/** Distance between two { lat, lng } points in kilometres. */
const distanceKm = (a, b) => {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

/** The partner's saved home point, or null when the address has no usable map location. */
const homeBase = (worker) => {
  const lat = Number(worker && worker.address && worker.address.lat);
  const lng = Number(worker && worker.address && worker.address.lng);
  return validPoint(lat, lng) ? { lat, lng } : null;
};

/**
 * The radius (km) this partner is limited to, or null when the platform radius applies to him:
 * switch off, nothing chosen, or no saved home location.
 */
const personalRadiusKm = (worker, config) => {
  if (!config || !config.isWorkerServiceRadiusEnabled) return null;
  const chosen = Number(worker && worker.settings && worker.settings.serviceRange);
  if (!Number.isFinite(chosen) || chosen <= 0) return null;
  if (!homeBase(worker)) return null;
  const min = Number(config.workerServiceRadiusMinKm) || 1;
  const max = Math.max(Number(config.workerServiceRadiusMaxKm) || min, min);
  return Math.min(Math.max(chosen, min), max);
};

/** Kilometres from the partner's home address to a point; null without a saved home location. */
const homeDistanceKm = (worker, point) => {
  const base = homeBase(worker);
  return base ? distanceKm(base, point) : null;
};

/**
 * Is the point inside this partner's own service area?
 *   true / false  the partner has a personal radius and this is the answer
 *   null          he has none, so the platform radius decides
 */
const insideOwnArea = (worker, point, config) => {
  const radius = personalRadiusKm(worker, config);
  if (radius === null) return null;
  return homeDistanceKm(worker, point) <= radius;
};

/** A latitude / longitude box that surely contains every point within `km` of `center` (a cheap pre-filter). */
const boundingBox = (center, km) => {
  const dLat = km / 111.32;
  const dLng = km / (111.32 * Math.max(Math.cos(toRad(center.lat)), 0.01));
  return { minLat: center.lat - dLat, maxLat: center.lat + dLat, minLng: center.lng - dLng, maxLng: center.lng + dLng };
};

/**
 * What to do with a radius a partner sent when saving his profile.
 *   { action: 'ignore' }          the feature is off, or nothing was sent: leave the stored value alone
 *   { action: 'clear' }           empty: use the platform radius
 *   { action: 'set', value }      a valid radius, rounded to 0.1 km
 *   { action: 'error', message }  refused, with a reason the partner can read
 */
const validateServiceRadius = (raw, config) => {
  if (!config || !config.isWorkerServiceRadiusEnabled || raw === undefined) return { action: 'ignore' };
  if (raw === null || raw === '') return { action: 'clear' };
  const n = Number(raw);
  if (!Number.isFinite(n)) return { action: 'error', message: 'Service radius must be a number of kilometres.' };
  const value = Math.round(n * 10) / 10;
  const min = Number(config.workerServiceRadiusMinKm) || 1;
  const max = Math.max(Number(config.workerServiceRadiusMaxKm) || min, min);
  if (value < min || value > max) return { action: 'error', message: `Choose a service radius between ${min} and ${max} km.` };
  return { action: 'set', value };
};

module.exports = { distanceKm, homeBase, personalRadiusKm, homeDistanceKm, insideOwnArea, boundingBox, validateServiceRadius };
