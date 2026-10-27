const Booking = require('../models/Booking');

/**
 * Brute-force protection for the customer's codes (arrival and payment). A 4-digit code has only
 * 10,000 possibilities, so after MAX_ATTEMPTS wrong tries the code is locked for LOCK_MINUTES.
 * Counters live on the booking and are updated atomically, so parallel guesses cannot slip past.
 *   kind: 'visit' | 'payment'
 */
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

/** Minutes left on a lock, or 0 when the code can be tried. */
const lockedMinutes = (booking, kind) => {
  const until = booking?.otpGuard?.[kind]?.lockedUntil;
  if (!until) return 0;
  const ms = new Date(until).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 60000) : 0;
};

const lockedResponse = (minutes) => ({
  statusCode: 429,
  body: { success: false, message: `Too many wrong codes. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` }
});

/** Counts a wrong code. Returns { locked, minutes, remaining } for the response. */
const registerFailure = async (bookingId, kind) => {
  const updated = await Booking.findOneAndUpdate(
    { _id: bookingId },
    { $inc: { [`otpGuard.${kind}.attempts`]: 1 } },
    { new: true }
  ).select('otpGuard');
  const attempts = updated?.otpGuard?.[kind]?.attempts || 1;

  if (attempts >= MAX_ATTEMPTS) {
    await Booking.updateOne(
      { _id: bookingId },
      { $set: { [`otpGuard.${kind}.attempts`]: 0, [`otpGuard.${kind}.lockedUntil`]: new Date(Date.now() + LOCK_MINUTES * 60000) } }
    );
    return { locked: true, minutes: LOCK_MINUTES, remaining: 0 };
  }
  return { locked: false, minutes: 0, remaining: MAX_ATTEMPTS - attempts };
};

/** The right code was entered: forget earlier wrong tries. */
const clearFailures = (bookingId, kind) =>
  Booking.updateOne({ _id: bookingId }, { $set: { [`otpGuard.${kind}.attempts`]: 0, [`otpGuard.${kind}.lockedUntil`]: null } });

/** Message for a wrong code, with how many tries are left. */
const wrongCodeMessage = (base, failure) =>
  failure.locked
    ? `Too many wrong codes. Please try again in ${failure.minutes} minutes.`
    : `${base} ${failure.remaining} ${failure.remaining === 1 ? 'try' : 'tries'} left.`;

module.exports = { lockedMinutes, lockedResponse, registerFailure, clearFailures, wrongCodeMessage, MAX_ATTEMPTS, LOCK_MINUTES };
