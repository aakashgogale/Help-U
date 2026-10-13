/**
 * Turns a booking into a readable lifecycle timeline for the user app,
 * worker app and admin panel.
 *
 * New bookings carry `statusHistory` (written by the backend on every change).
 * Older bookings do not, so for those the timeline is rebuilt from the
 * timestamp fields that have always existed.
 */

const STATUS_LABELS = {
  searching: { label: 'Searching for a professional', tone: 'info' },
  requested: { label: 'Requested', tone: 'info' },
  pending: { label: 'Pending', tone: 'info' },
  awaiting_payment: { label: 'Awaiting payment', tone: 'warning' },
  confirmed: { label: 'Accepted by professional', tone: 'success' },
  accepted: { label: 'Accepted by professional', tone: 'success' },
  assigned: { label: 'Professional assigned', tone: 'success' },
  journey_started: { label: 'Professional on the way', tone: 'info' },
  visited: { label: 'Professional arrived · work started', tone: 'info' },
  in_progress: { label: 'Work in progress', tone: 'info' },
  work_done: { label: 'Work completed · bill generated', tone: 'success' },
  completed: { label: 'Booking completed', tone: 'success' },
  cancelled: { label: 'Booking cancelled', tone: 'danger' },
  rejected: { label: 'No professional available', tone: 'danger' }
};

const EVENT_LABELS = {
  created: { label: 'Booking requested', tone: 'info' },
  payment: { label: 'Payment received', tone: 'success' },
  reviewed: { label: 'Customer reviewed the service', tone: 'success' },
  disputed: { label: 'Dispute raised', tone: 'warning' },
  dispute_resolved: { label: 'Dispute closed', tone: 'success' },
  refunded: { label: 'Refund issued', tone: 'warning' },
  reassigned: { label: 'Professional cancelled · finding a new one', tone: 'warning' }
};

const BY_LABELS = { user: 'Customer', worker: 'Professional', admin: 'Support team', system: null };

const describe = (entry) => {
  if (entry.event && entry.event !== 'status') {
    const base = EVENT_LABELS[entry.event] || { label: entry.event, tone: 'info' };
    if (entry.event === 'dispute_resolved' && entry.note === 'rejected') {
      return { label: 'Dispute closed without action', tone: 'info' };
    }
    return base;
  }
  return STATUS_LABELS[entry.status] || { label: entry.status || 'Updated', tone: 'info' };
};

const fromTimestamps = (b) => {
  const items = [];
  const push = (at, status, event = 'status') => { if (at) items.push({ at, status, event }); };
  push(b.createdAt, b.status, 'created');
  push(b.acceptedAt, 'confirmed');
  push(b.journeyStartedAt, 'journey_started');
  push(b.visitedAt, 'visited');
  if (['work_done', 'completed'].includes(b.status) && b.vendorBillId) push(b.updatedAt, 'work_done');
  if (b.cashCollectedAt) push(b.cashCollectedAt, b.status, 'payment');
  push(b.completedAt, 'completed');
  push(b.cancelledAt, 'cancelled');
  push(b.reviewedAt, b.status, 'reviewed');
  return items;
};

/**
 * Timeline entries, oldest first:
 *   [{ key, label, tone, at: Date, by, note }]
 * Consecutive duplicates (the same label twice in a row) are collapsed.
 */
export const buildBookingTimeline = (booking) => {
  if (!booking) return [];
  const source = Array.isArray(booking.statusHistory) && booking.statusHistory.length > 0
    ? booking.statusHistory
    : fromTimestamps(booking);

  const sorted = [...source]
    .filter((e) => e && e.at)
    .sort((a, b) => new Date(a.at) - new Date(b.at));

  const result = [];
  sorted.forEach((entry, i) => {
    const { label, tone } = describe(entry);
    if (result.length && result[result.length - 1].label === label) return;
    // A 'searching' entry right after 'created' adds nothing for the reader.
    if (entry.status === 'searching' && entry.event === 'status' && result.length === 1 && result[0].key.startsWith('created')) return;
    result.push({
      key: `${entry.event || 'status'}-${entry.status}-${i}`,
      label,
      tone,
      at: new Date(entry.at),
      by: BY_LABELS[entry.by] || null,
      note: entry.note && entry.event !== 'dispute_resolved' ? entry.note : null
    });
  });

  return result;
};

export default buildBookingTimeline;
