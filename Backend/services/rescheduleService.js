const { BOOKING_STATUS } = require('../utils/constants');
const { createNotification } = require('../controllers/notificationControllers/notificationController');
const { slotStartMs, isOfferedSlot, getConflictingWorkerIds } = require('./workerAvailabilityService');

// A booking can only move before the visit is under way.
const MOVABLE = [
  BOOKING_STATUS.SEARCHING, BOOKING_STATUS.REQUESTED, BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.ASSIGNED
];

class RescheduleError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const describeSlot = (scheduledDate, scheduledTime) =>
  `${new Date(scheduledDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} • ${scheduledTime}`;

/**
 * Whether this booking may be moved at all right now (status, admin switches, limits).
 * `by` is 'user' or 'worker'. Throws a RescheduleError with a message fit to show.
 */
const assertReschedulable = (booking, config, by) => {
  if (booking.status === BOOKING_STATUS.COMPLETED) throw new RescheduleError('Cannot reschedule completed booking');
  if (booking.status === BOOKING_STATUS.CANCELLED) throw new RescheduleError('Cannot reschedule cancelled booking');
  if (!MOVABLE.includes(booking.status)) {
    throw new RescheduleError(by === 'worker'
      ? 'This job can no longer be rescheduled.'
      : 'This booking can no longer be rescheduled. You can cancel it instead.');
  }
  if (!config.isRescheduleEnabled || (by === 'worker' && !config.isWorkerRescheduleEnabled)) {
    throw new RescheduleError('Rescheduling is currently not available.', 403);
  }
  if (config.rescheduleMaxCount > 0 && (booking.rescheduleCount || 0) >= config.rescheduleMaxCount) {
    throw new RescheduleError(`This booking has already been rescheduled the maximum of ${config.rescheduleMaxCount} time${config.rescheduleMaxCount === 1 ? '' : 's'}.`);
  }
  if (config.rescheduleCutoffHours > 0) {
    const currentStart = slotStartMs(booking);
    if (Number.isFinite(currentStart) && currentStart - Date.now() < config.rescheduleCutoffHours * 60 * 60 * 1000) {
      throw new RescheduleError(`Rescheduling closes ${config.rescheduleCutoffHours} hour${config.rescheduleCutoffHours === 1 ? '' : 's'} before the appointment.`);
    }
  }
};

/**
 * The new slot must respect the same admin rules as a new booking, and must not collide with
 * another job of the professional already assigned to this one. Returns the slot's start (ms).
 */
const validateNewSlot = async (booking, { scheduledDate, timeSlot }, config) => {
  const newStart = slotStartMs({ scheduledDate, timeSlot });
  if (!Number.isFinite(newStart)) throw new RescheduleError('Please choose a valid date and time slot.');
  if (!isOfferedSlot({ timeSlot }, config)) {
    throw new RescheduleError('That time is not one of the available slots. Please pick a slot from the list.');
  }
  const earliest = Date.now() + (config.slotMinLeadMinutes || 0) * 60 * 1000 - 2 * 60 * 1000;
  const latest = Date.now() + (config.slotMaxDaysAhead + 1) * 24 * 60 * 60 * 1000;
  if (newStart < earliest) throw new RescheduleError('That time slot is too soon. Please choose a later slot.');
  if (newStart > latest) throw new RescheduleError(`Bookings can be made up to ${config.slotMaxDaysAhead} days ahead.`);
  if (booking.vendorId) {
    const conflicts = await getConflictingWorkerIds([booking.vendorId], { slotStart: newStart, config, excludeBookingId: booking._id });
    if (conflicts.size > 0) throw new RescheduleError('The professional is not available at that time. Please pick another slot.', 409);
  }
  return newStart;
};

/**
 * Moves the booking to the new slot, records it in the timeline and tells both sides.
 * `by` is who asked for it ('user', or 'worker' when the customer accepted the partner's request).
 */
const applyReschedule = async (booking, { scheduledDate, scheduledTime, timeSlot }, newStart, { by, config, io }) => {
  booking.scheduledDate = new Date(scheduledDate);
  booking.scheduledTime = scheduledTime;
  booking.timeSlot = { start: timeSlot.start, end: timeSlot.end };
  booking.bookingType = 'scheduled';
  booking.rescheduleCount = (booking.rescheduleCount || 0) + 1;
  if (booking.rescheduleRequest?.status === 'pending') {
    booking.rescheduleRequest.status = by === 'worker' ? 'accepted' : 'declined';
    booking.rescheduleRequest.respondedAt = new Date();
  }

  // Still looking for a professional: keep searching until the cut-off before the NEW slot
  if (!booking.vendorId) {
    const normalDeadline = Date.now() + config.maxSearchTime * 60 * 1000;
    booking.expiresAt = new Date(Math.max(normalDeadline, newStart - (config.scheduledBookingCutoffHours || 0) * 60 * 60 * 1000));
  }

  const when = describeSlot(scheduledDate, scheduledTime);
  booking.statusHistory = booking.statusHistory || [];
  booking.statusHistory.push({
    status: booking.status,
    event: 'rescheduled',
    note: by === 'worker' ? `${when} (requested by the professional)` : when,
    by: 'user',
    at: new Date()
  });
  await booking.save();

  if (booking.vendorId) await createNotification({
    vendorId: booking.vendorId,
    type: 'booking_rescheduled',
    title: 'Booking Rescheduled',
    message: `Booking ${booking.bookingNumber} has been rescheduled to ${when}.`,
    relatedId: booking._id,
    relatedType: 'booking',
    pushData: { type: 'booking_rescheduled', bookingId: booking._id.toString(), link: `/worker/bookings/${booking._id}` }
  });
  await createNotification({
    userId: booking.userId,
    type: 'booking_rescheduled',
    title: 'Booking Rescheduled',
    message: `Your booking ${booking.bookingNumber} has been rescheduled to ${when}.`,
    relatedId: booking._id,
    relatedType: 'booking',
    pushData: { type: 'booking_rescheduled', bookingId: booking._id.toString(), link: `/bookings/${booking._id}` }
  });
  emitBookingUpdated(io, booking, { rescheduled: true });
};

const emitBookingUpdated = (io, booking, extra = {}) => {
  if (!io) return;
  const payload = { bookingId: booking._id.toString(), ...extra };
  if (booking.vendorId) io.to(`vendor_${booking.vendorId}`).emit('booking_updated', payload);
  io.to(`booking_${booking._id}`).emit('booking_updated', payload);
  io.to(`user_${booking.userId}`).emit('booking_updated', payload);
};

module.exports = {
  RescheduleError,
  describeSlot,
  assertReschedulable,
  validateNewSlot,
  applyReschedule,
  emitBookingUpdated
};
