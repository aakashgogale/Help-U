/**
 * Worker Scoring Service
 *
 * Orders the workers found near a booking before they are alerted in waves.
 *
 * 'distance' strategy: closest first (the original behaviour).
 * 'smart' strategy: a weighted score of
 *   - distance        (closer is better, relative to the search radius)
 *   - rating          (customer rating, smoothed for workers with few reviews)
 *   - acceptance rate (accepted alerts / alerts received, recent window)
 *   - completion rate (completed jobs / completed + cancelled by the worker)
 *
 * Rates are smoothed towards a neutral prior so a new worker with one
 * rejected alert is not ranked below everyone, and a worker with one
 * accepted alert is not ranked above everyone. Weights and the look-back
 * window come from the booking configuration.
 */

const mongoose = require('mongoose');
const Worker = require('../models/Worker');
const Booking = require('../models/Booking');
const BookingRequest = require('../models/BookingRequest');
const { BOOKING_STATUS } = require('../utils/constants');

// Prior assumed for a worker with no history, and how many samples it is
// worth. A worker needs real data to move far from these.
const PRIOR = {
  acceptance: { rate: 0.6, weight: 5 },
  completion: { rate: 0.85, weight: 5 },
  rating: { value: 4.0, weight: 3 }
};

// A rating is only trusted for the minimum-rating filter with this many reviews.
const MIN_REVIEWS_FOR_FILTER = 3;

const smooth = (successes, total, { rate, weight }) =>
  (successes + rate * weight) / (total + weight);

const toObjectIds = (ids) => ids.map((id) => new mongoose.Types.ObjectId(String(id)));

/**
 * Acceptance and completion counts per worker over the configured window.
 */
const loadWorkerStats = async (workerIds, windowDays) => {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const ids = toObjectIds(workerIds);

  const [requestStats, jobStats] = await Promise.all([
    BookingRequest.aggregate([
      { $match: { vendorId: { $in: ids }, sentAt: { $gte: since } } },
      {
        $group: {
          _id: '$vendorId',
          total: { $sum: 1 },
          accepted: { $sum: { $cond: [{ $eq: ['$status', 'ACCEPTED'] }, 1, 0] } },
          totalResponses: {
            $sum: { $cond: [{ $ne: ['$respondedAt', null] }, 1, 0] }
          },
          totalResponseTimeMs: {
            $sum: {
              $cond: [
                { $ne: ['$respondedAt', null] },
                { $subtract: ['$respondedAt', '$sentAt'] },
                0
              ]
            }
          }
        }
      }
    ]),
    Booking.aggregate([
      {
        $match: {
          vendorId: { $in: ids },
          createdAt: { $gte: since },
          $or: [
            { status: BOOKING_STATUS.COMPLETED },
            { status: BOOKING_STATUS.CANCELLED, cancelledBy: { $in: ['worker', 'vendor'] } }
          ]
        }
      },
      {
        $group: {
          _id: '$vendorId',
          completed: { $sum: { $cond: [{ $eq: ['$status', BOOKING_STATUS.COMPLETED] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', BOOKING_STATUS.CANCELLED] }, 1, 0] } }
        }
      }
    ])
  ]);

  const stats = new Map();
  for (const id of workerIds) {
    stats.set(String(id), { total: 0, accepted: 0, completed: 0, cancelled: 0, avgResponseSec: 45 });
  }
  for (const r of requestStats) {
    const avgSec = r.totalResponses > 0 ? (r.totalResponseTimeMs / r.totalResponses / 1000) : 45;
    Object.assign(stats.get(String(r._id)) || {}, {
      total: r.total,
      accepted: r.accepted,
      avgResponseSec: Math.round(avgSec)
    });
  }
  for (const j of jobStats) {
    Object.assign(stats.get(String(j._id)) || {}, { completed: j.completed, cancelled: j.cancelled });
  }
  return stats;
};

/**
 * Ranks nearby workers for a booking.
 *
 * @param {Array}  workers   Output of findNearbyWorkers (each has _id, distance)
 * @param {Object} config    getBookingConfig() result
 * @param {Object} options   { radiusKm, isEmergency, preferredWorkerId }
 * @returns {Promise<Array>} Workers in alert order, each with a `score` (0-100)
 *                           when the smart strategy is used.
 */
const rankWorkers = async (workers, config, { radiusKm = 10, isEmergency = false, preferredWorkerId = null } = {}) => {
  if (!Array.isArray(workers) || workers.length === 0) return [];

  const byDistance = (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity);
  const ids = workers.map((w) => String(w._id));

  // Fields not always returned by findNearbyWorkers (the Redis path selects
  // fewer), fetched once for the whole set.
  const profiles = await Worker.find({ _id: { $in: ids } })
    .select('rating totalReviews settings.acceptsEmergency')
    .lean();
  const profileMap = new Map(profiles.map((p) => [String(p._id), p]));

  let candidates = workers.map((w) => ({ ...w, _profile: profileMap.get(String(w._id)) || {} }));

  // Emergency jobs only go to workers who accept them.
  if (isEmergency) {
    candidates = candidates.filter((w) => w._profile.settings?.acceptsEmergency !== false);
  }

  // Minimum rating, applied only where the rating is backed by enough reviews.
  if (config.assignmentMinRating > 0) {
    candidates = candidates.filter((w) => {
      const reviews = w._profile.totalReviews || 0;
      return reviews < MIN_REVIEWS_FOR_FILTER || (w._profile.rating || 0) >= config.assignmentMinRating;
    });
  }

  let ranked;
  if (config.assignmentStrategy !== 'smart') {
    ranked = candidates.sort(byDistance);
  } else {
    const stats = await loadWorkerStats(ids, config.assignmentStatsWindowDays);
    const weights = {
      distance: config.assignmentDistanceWeight || 0.35,
      rating: config.assignmentRatingWeight || 0.20,
      acceptance: config.assignmentAcceptanceWeight || 0.15,
      completion: config.assignmentCompletionWeight || 0.15,
      responseTime: config.assignmentResponseTimeWeight || 0.15
    };
    const weightSum = Object.values(weights).reduce((s, w) => s + w, 0) || 1;
    const maxDistance = Math.max(radiusKm, ...candidates.map((w) => w.distance || 0), 1);

    const calcResponseScore = (avgSec) => {
      if (avgSec <= 20) return 1.0;
      if (avgSec <= 60) return 1.0 - ((avgSec - 20) / 40) * 0.25;
      if (avgSec <= 180) return 0.75 - ((avgSec - 60) / 120) * 0.35;
      return Math.max(0.1, 0.40 - ((avgSec - 180) / 300) * 0.3);
    };

    ranked = candidates.map((w) => {
      const s = stats.get(String(w._id)) || { total: 0, accepted: 0, completed: 0, cancelled: 0, avgResponseSec: 45 };
      const reviews = w._profile.totalReviews || 0;

      const factors = {
        // Unknown distance (city fallback search) scores as mid-range.
        distance: w.distance == null ? 0.5 : Math.max(0, 1 - w.distance / maxDistance),
        rating: ((w._profile.rating || 0) * reviews + PRIOR.rating.value * PRIOR.rating.weight)
          / (reviews + PRIOR.rating.weight) / 5,
        acceptance: smooth(s.accepted, s.total, PRIOR.acceptance),
        completion: smooth(s.completed, s.completed + s.cancelled, PRIOR.completion),
        responseTime: calcResponseScore(s.avgResponseSec || 45)
      };

      const score = Object.entries(weights)
        .reduce((sum, [key, weight]) => sum + factors[key] * weight, 0) / weightSum;

      return {
        ...w,
        score: Math.round(score * 1000) / 10,
        avgResponseSec: s.avgResponseSec
      };
    }).sort((a, b) => (b.score - a.score) || byDistance(a, b));
  }

  // A recurring plan's previous worker goes first so the customer keeps the
  // same professional where possible.
  if (preferredWorkerId) {
    const index = ranked.findIndex((w) => String(w._id) === String(preferredWorkerId));
    if (index > 0) ranked.unshift(ranked.splice(index, 1)[0]);
  }

  return ranked.map(({ _profile, ...w }) => w);
};

module.exports = { rankWorkers };
