/**
 * Rules for when a worker may still change, or withdraw, a bill that has been sent to the customer.
 * Used by the bill editor and the withdraw endpoint so a customer can never pay an amount the
 * worker is editing.
 */
const { PAYMENT_STATUS, BOOKING_STATUS } = require('./constants');

// How long a Razorpay order created for the customer stays payable in their checkout window
const ONLINE_ORDER_WINDOW_MS = 15 * 60 * 1000;

/** Why the bill is locked, or null when it can still be changed. */
const billLockReason = (booking) => {
  // A booking paid online up front has paymentStatus 'success' before any bill exists, so online
  // payment only counts as the bill being paid once the bill has been sent to the customer.
  const billPaid = booking.cashCollected
    || booking.status === BOOKING_STATUS.COMPLETED
    || (booking.paymentStatus === PAYMENT_STATUS.SUCCESS && !!booking.billFinalizedAt);
  if (billPaid) {
    return 'Payment is already complete, so the bill can no longer be changed.';
  }

  const startedAt = booking.paymentOrderCreatedAt ? new Date(booking.paymentOrderCreatedAt).getTime() : 0;
  if (startedAt && Date.now() - startedAt < ONLINE_ORDER_WINDOW_MS) {
    return 'The customer is paying online right now. Please wait a few minutes before changing the bill.';
  }

  return null;
};

module.exports = { billLockReason };
