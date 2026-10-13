/**
 * Recurrence helpers for recurring bookings.
 */

const { RECURRING_FREQUENCY_DAYS } = require('./constants');

/**
 * The visit date that follows `fromDate` for a frequency.
 * Monthly keeps the day of month where it exists (Jan 31 -> Feb 28/29).
 */
const nextOccurrenceDate = (fromDate, frequency) => {
  const date = new Date(fromDate);

  if (frequency === 'monthly') {
    const day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + 1);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(day, lastDay));
    return date;
  }

  const days = RECURRING_FREQUENCY_DAYS[frequency] || 7;
  date.setUTCDate(date.getUTCDate() + days);
  return date;
};

module.exports = { nextOccurrenceDate };
