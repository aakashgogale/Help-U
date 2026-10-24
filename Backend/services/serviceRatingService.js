const mongoose = require('mongoose');
const Review = require('../models/Review');

/**
 * Service ratings from real customer reviews.
 *
 * Only reviews an admin has not hidden or deleted count (status 'active'). A service with no
 * reviews gets no entry, so callers can fall back to the admin-entered display value or show nothing.
 */

const toObjectIds = (ids) =>
  [...new Set((ids || []).map(String))]
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

/** Map of serviceId -> { avg, count } for services that have at least one active review. */
const getServiceRatings = async (serviceIds) => {
  const ids = toObjectIds(serviceIds);
  if (ids.length === 0) return new Map();

  const rows = await Review.aggregate([
    { $match: { serviceId: { $in: ids }, status: 'active' } },
    { $group: { _id: '$serviceId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  return new Map(rows.map((r) => [String(r._id), { avg: r.avg, count: r.count }]));
};

/** Combined average across several services (weighted by how many reviews each has). */
const combineRatings = (ratings) => {
  let total = 0;
  let count = 0;
  ratings.forEach((r) => {
    if (r && r.count > 0) {
      total += r.avg * r.count;
      count += r.count;
    }
  });
  return count > 0 ? { avg: total / count, count } : null;
};

/** "4.8" (one decimal, as customers expect). */
const formatRatingValue = (avg) => (Math.round(avg * 10) / 10).toFixed(1);

/** "1 review", "23 reviews", "1.2K reviews". */
const formatReviewsLabel = (count) => {
  if (count === 1) return '1 review';
  if (count < 1000) return `${count} reviews`;
  return `${(Math.round(count / 100) / 10).toFixed(1).replace(/\.0$/, '')}K reviews`;
};

/**
 * What the apps display: the real average when there are reviews, otherwise the admin's own
 * display values (possibly empty).
 */
const toDisplayRating = (real, adminRating = '', adminLabel = '') => {
  if (real && real.count > 0) {
    return { rating: formatRatingValue(real.avg), reviewsLabel: formatReviewsLabel(real.count), reviewsCount: real.count, isReal: true };
  }
  return { rating: adminRating || '', reviewsLabel: adminLabel || '', reviewsCount: 0, isReal: false };
};

module.exports = { getServiceRatings, combineRatings, toDisplayRating, formatRatingValue, formatReviewsLabel };
