/**
 * The customer's answers (brand, vehicle type...) on a booking, as [{ title, quantity, details }].
 * Reads the slim list on a worker alert (`bookedDetails`) or the full booked items, and skips items
 * with no answers.
 */
export const bookedDetailsOf = (booking) => {
  if (!booking) return [];
  if (Array.isArray(booking.bookedDetails)) return booking.bookedDetails.filter((i) => (i.details || []).length > 0);
  return (booking.bookedItems || booking.items || [])
    .filter((i) => (i.details || []).length > 0)
    .map((i) => ({ title: i.card?.title || i.serviceName || i.title || '', quantity: i.quantity || 1, details: i.details }));
};
