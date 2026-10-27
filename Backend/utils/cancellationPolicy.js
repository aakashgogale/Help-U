const { slotStartMs } = require('../services/workerAvailabilityService');

/**
 * Cancellation policy for a booking that already has a professional allotted.
 *
 * Free when ANY of these hold:
 *   - nobody has been allotted yet
 *   - the professional accepted no more than `…FreeCancelGraceMinutes` ago (this is what makes
 *     instant bookings cancellable for a moment, since they have no later slot)
 *   - the slot is at least `…FreeCancelHours` away
 * Otherwise the late fee (customer) or penalty (professional) applies, and is never more than the
 * booking total. The numbers all come from the admin's booking configuration.
 */

const HOUR_MS = 60 * 60 * 1000;
const MIN_MS = 60 * 1000;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const PARTY_KEYS = {
  user: {
    hours: 'userFreeCancelHours',
    grace: 'userFreeCancelGraceMinutes',
    type: 'userLateCancelFeeType',
    value: 'userLateCancelFeeValue',
    max: 'userLateCancelFeeMax'
  },
  worker: {
    hours: 'workerFreeCancelHours',
    grace: 'workerFreeCancelGraceMinutes',
    type: 'workerLateCancelPenaltyType',
    value: 'workerLateCancelPenaltyValue',
    max: 'workerLateCancelPenaltyMax'
  }
};

const feeFor = (booking, { type, value, max }) => {
  const total = Math.max(0, Number(booking.finalAmount) || 0);
  let fee = type === 'percentage' ? (total * value) / 100 : value;
  if (max > 0) fee = Math.min(fee, max);
  return round2(Math.min(Math.max(0, fee), total));
};

/**
 * @param booking  a Booking document (or plain object)
 * @param party    'user' | 'worker'
 * @param config   result of getBookingConfig()
 * @returns {{ isFree, fee, reason, freeUntil, windowHours }}
 *   reason: 'not_allotted' | 'grace' | 'before_window' | 'late'
 *   freeUntil: ISO time the free cancellation ends, or null when it does not depend on the slot
 */
const evaluateCancellation = (booking, party, config, now = Date.now()) => {
  const keys = PARTY_KEYS[party];
  const windowHours = Number(config[keys.hours]) || 0;
  const graceMinutes = Number(config[keys.grace]) || 0;

  const allottedAt = booking.acceptedAt || booking.assignedAt;
  if (!booking.vendorId || !allottedAt) {
    return { isFree: true, fee: 0, reason: 'not_allotted', freeUntil: null, windowHours };
  }

  const allottedMs = new Date(allottedAt).getTime();
  const graceEnds = graceMinutes > 0 && Number.isFinite(allottedMs) ? allottedMs + graceMinutes * MIN_MS : null;

  // Only a scheduled, non-emergency booking has a slot to count back from.
  const slotMs = booking.bookingType === 'scheduled' && !booking.isEmergency ? slotStartMs(booking) : null;
  const windowEnds = windowHours > 0 && Number.isFinite(slotMs) ? slotMs - windowHours * HOUR_MS : null;

  if (windowEnds !== null && now <= windowEnds) {
    return { isFree: true, fee: 0, reason: 'before_window', freeUntil: new Date(windowEnds).toISOString(), windowHours };
  }
  if (graceEnds !== null && now <= graceEnds) {
    return { isFree: true, fee: 0, reason: 'grace', freeUntil: new Date(graceEnds).toISOString(), windowHours };
  }

  const fee = feeFor(booking, {
    type: config[keys.type],
    value: Number(config[keys.value]) || 0,
    max: Number(config[keys.max]) || 0
  });
  // A fee of 0 is simply a free cancellation
  return { isFree: fee === 0, fee, reason: 'late', freeUntil: null, windowHours };
};

/** The late-cancellation fee for a party, ignoring the free window (what a late cancel would cost). */
const lateFeeAmount = (booking, party, config) => {
  const keys = PARTY_KEYS[party];
  return feeFor(booking, {
    type: config[keys.type],
    value: Number(config[keys.value]) || 0,
    max: Number(config[keys.max]) || 0
  });
};

/**
 * Fee once the professional is on the way (or has arrived). A flat admin fee (`cancellationPenalty`,
 * or the booking's own visiting charge after arrival), but never less than the late fee: cancelling
 * later must not cost less than cancelling a little earlier. Never more than the booking amount.
 */
const onTheWayFee = (booking, config, { arrived = false } = {}) => {
  const flat = Number(config.cancellationPenalty) || 0;
  const base = arrived && Number(booking.visitingCharges) > 0 ? Number(booking.visitingCharges) : flat;
  const total = Math.max(0, Number(booking.finalAmount) || 0);
  return round2(Math.min(Math.max(base, lateFeeAmount(booking, 'user', config)), total));
};

module.exports = { evaluateCancellation, lateFeeAmount, onTheWayFee };
