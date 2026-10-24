const Booking = require('../models/Booking');
const { BOOKING_STATUS } = require('../utils/constants');

/**
 * Who is free for a booking, worked out from the bookings themselves (not from a status flag
 * that has to be kept in sync by hand).
 *
 *  - "Busy now": the worker is at work right now: an instant job he accepted that is not finished,
 *    or any job that is physically under way (on the way, on site, working, awaiting payment).
 *    A scheduled job for tomorrow that he merely accepted does NOT make him busy now.
 *  - "Conflict": his existing jobs would overlap a scheduled slot, allowing for the job length
 *    and travel buffer configured by the admin.
 */

// Accepted and not yet finished
const OPEN_STATUSES = [
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.ACCEPTED,
  BOOKING_STATUS.ASSIGNED,
  BOOKING_STATUS.AWAITING_PAYMENT,
  BOOKING_STATUS.JOURNEY_STARTED,
  BOOKING_STATUS.VISITED,
  BOOKING_STATUS.IN_PROGRESS,
  BOOKING_STATUS.WORK_DONE
];

// Physically under way
const UNDERWAY_STATUSES = [
  BOOKING_STATUS.JOURNEY_STARTED,
  BOOKING_STATUS.VISITED,
  BOOKING_STATUS.IN_PROGRESS,
  BOOKING_STATUS.WORK_DONE
];

// The business runs in India; slot times ("14:00") are wall-clock times there.
const BUSINESS_UTC_OFFSET_MIN = 330;
const MIN = 60 * 1000;

// An instant job that is still "open" after this long was abandoned (never completed or
// cancelled); it must not block the worker forever.
const STALE_INSTANT_MS = 12 * 60 * MIN;
const freshInstant = () => new Date(Date.now() - STALE_INSTANT_MS);

/** Start of a scheduled booking's slot as a real instant (ms). Null for anything unparseable. */
const slotStartMs = (booking) => {
  const date = booking?.scheduledDate ? new Date(booking.scheduledDate) : null;
  const start = booking?.timeSlot?.start;
  if (!date || Number.isNaN(date.getTime()) || typeof start !== 'string') return null;
  const match = start.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;

  // Calendar date as seen in India, then that date's wall-clock time
  const local = new Date(date.getTime() + BUSINESS_UTC_OFFSET_MIN * MIN);
  const utc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), Number(match[1]), Number(match[2]));
  return utc - BUSINESS_UTC_OFFSET_MIN * MIN;
};

const toIds = (workers) => (workers || []).map((w) => String(w._id || w));

/** Set of worker ids who are at work right now. */
const getBusyWorkerIds = async (workerIds) => {
  const ids = toIds(workerIds);
  if (ids.length === 0) return new Set();
  const rows = await Booking.find({
    vendorId: { $in: ids },
    $or: [
      { bookingType: { $ne: 'scheduled' }, status: { $in: OPEN_STATUSES }, createdAt: { $gte: freshInstant() } },
      { status: { $in: UNDERWAY_STATUSES } }
    ]
  }).select('vendorId').lean();
  return new Set(rows.map((r) => String(r.vendorId)));
};

/**
 * Set of worker ids whose existing jobs overlap [slotStart, slotStart + duration + buffer].
 * Pass `excludeBookingId` when re-checking a booking against its own worker.
 */
const getConflictingWorkerIds = async (workerIds, { slotStart, config, excludeBookingId = null }) => {
  const ids = toIds(workerIds);
  if (ids.length === 0 || !Number.isFinite(slotStart)) return new Set();

  const span = ((config.scheduledJobDurationMinutes || 90) + (config.scheduledTravelBufferMinutes || 30)) * MIN;
  const newStart = slotStart;
  const newEnd = slotStart + span;

  // Narrow the DB read to a couple of days around the slot, plus open instant jobs
  const dayWindow = 2 * 24 * 60 * MIN;
  const rows = await Booking.find({
    vendorId: { $in: ids },
    status: { $in: OPEN_STATUSES },
    ...(excludeBookingId ? { _id: { $ne: excludeBookingId } } : {}),
    $or: [
      { bookingType: 'scheduled', scheduledDate: { $gte: new Date(newStart - dayWindow), $lte: new Date(newEnd + dayWindow) } },
      { bookingType: { $ne: 'scheduled' }, createdAt: { $gte: freshInstant() } }
    ]
  }).select('vendorId bookingType scheduledDate timeSlot acceptedAt createdAt').lean();

  const conflicts = new Set();
  for (const b of rows) {
    const start = b.bookingType === 'scheduled'
      ? slotStartMs(b)
      : new Date(b.acceptedAt || b.createdAt).getTime();
    if (!Number.isFinite(start)) continue;
    if (newStart < start + span && newEnd > start) conflicts.add(String(b.vendorId));
  }
  return conflicts;
};

module.exports = {
  OPEN_STATUSES,
  UNDERWAY_STATUSES,
  slotStartMs,
  getBusyWorkerIds,
  getConflictingWorkerIds
};
