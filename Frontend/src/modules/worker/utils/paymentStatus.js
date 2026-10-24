// The server stores payment status in lowercase ('success'); older code compared against
// 'SUCCESS' / 'paid' exactly, so a paid booking could still look unpaid. Always go through
// this helper instead of comparing strings.
export const isOnlinePaid = (source) => {
  const status = String(source?.paymentStatus || '').toLowerCase();
  return status === 'success' || status === 'paid';
};
