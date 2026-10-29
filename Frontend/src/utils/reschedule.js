// Statuses in which a booking can still move (the visit is not under way).
const MOVABLE_STATUSES = ['searching', 'requested', 'confirmed', 'accepted', 'assigned'];

// The server makes the final call (including the cut-off before the appointment), this only decides whether to show the button.
export const canRescheduleBooking = (booking, config = {}) => {
  if (!booking || !MOVABLE_STATUSES.includes(booking.status?.toLowerCase())) return false;
  if (config.isRescheduleEnabled === false) return false;
  const max = Number(config.rescheduleMaxCount) || 0;
  return !(max > 0 && (booking.rescheduleCount || 0) >= max);
};

// A partner can ask for a new time only on a job that is already theirs and has not started.
export const canRequestReschedule = (booking, config = {}) =>
  !!booking?.vendorId
  && config.isWorkerRescheduleEnabled !== false
  && booking.rescheduleRequest?.status !== 'pending'
  && canRescheduleBooking(booking, config);
