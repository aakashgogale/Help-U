/**
 * The customer's payment confirmation code lives in ONE field: `customerConfirmationOTP`.
 * `paymentOtp` is the old field: nothing writes it any more, but bookings created before the change
 * may still hold their code there, so readers go through expectedPaymentCode() and never care which
 * is filled. Writers go through issuePaymentCode().
 */
const expectedPaymentCode = (booking) =>
  String(booking?.customerConfirmationOTP || booking?.paymentOtp || '').trim();

/** Keep the booking's code if it already has one, otherwise make a new 4-digit one. Returns the code. */
const issuePaymentCode = (booking) => {
  const code = expectedPaymentCode(booking) || Math.floor(1000 + Math.random() * 9000).toString();
  booking.customerConfirmationOTP = code;
  booking.paymentOtp = undefined; // migrate an old booking onto the single field
  return code;
};

/** Forget the code (payment finished or the bill was taken back), in both fields. */
const clearPaymentCode = (booking) => {
  booking.customerConfirmationOTP = undefined;
  booking.paymentOtp = undefined;
};

const CODE_NOT_ISSUED = {
  statusCode: 409,
  body: {
    success: false,
    message: 'The payment code has not been issued yet. Send the bill to the customer first, then ask them for their 4-digit code.'
  }
};

module.exports = { expectedPaymentCode, issuePaymentCode, clearPaymentCode, CODE_NOT_ISSUED };
