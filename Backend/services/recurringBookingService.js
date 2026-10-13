/**
 * Recurring Booking Service
 *
 * Books each later visit of a recurring plan Settings.recurringLeadHours
 * before it is due, through the same placeBooking() used at checkout, so
 * pricing, worker search and notifications are identical to a manual booking.
 *
 * The runner is safe to run on several server instances: each plan is
 * claimed with a short lock before a visit is booked.
 */

const RecurringBooking = require('../models/RecurringBooking');
const Booking = require('../models/Booking');
const { RECURRING_STATUS, BOOKING_STATUS } = require('../utils/constants');
const { getBookingConfig } = require('../utils/bookingConfig');
const { nextOccurrenceDate } = require('../utils/recurrence');
const { createNotification } = require('../controllers/notificationControllers/notificationController');

const RUN_INTERVAL_MS = 5 * 60 * 1000;
const LOCK_MS = 5 * 60 * 1000;
const BATCH_SIZE = 25;
const MAX_ATTEMPTS = 3;
// A visit whose date passed this long ago (e.g. the server was down) is
// skipped rather than booked late.
const MISSED_AFTER_MS = 12 * 60 * 60 * 1000;

const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const notifyUser = (plan, { type, title, message }) =>
  createNotification({
    userId: plan.userId,
    type,
    title,
    message,
    relatedId: plan._id,
    relatedType: 'recurring',
    pushData: { type, link: '/user/recurring-bookings' }
  }).catch((err) => console.error('[Recurring] Notification failed:', err.message));

/**
 * Moves a plan past one visit, completing it when all visits are used.
 */
const advance = (plan, { bookingId = null } = {}) => {
  plan.occurrencesCreated += 1;
  if (bookingId) plan.bookingIds.push(bookingId);
  if (plan.occurrencesCreated >= plan.occurrencesPlanned) {
    plan.status = RECURRING_STATUS.COMPLETED;
    plan.nextOccurrenceAt = null;
  } else {
    plan.nextOccurrenceAt = nextOccurrenceDate(plan.nextOccurrenceAt, plan.frequency);
  }
  plan.failedAttempts = 0;
};

/**
 * Worker of the plan's most recent completed visit.
 */
const preferredWorkerFor = async (plan) => {
  if (!plan.bookingIds?.length) return null;
  const last = await Booking.findOne({ _id: { $in: plan.bookingIds }, status: BOOKING_STATUS.COMPLETED, vendorId: { $ne: null } })
    .sort({ completedAt: -1 })
    .select('vendorId')
    .lean();
  return last?.vendorId || null;
};

/**
 * Books the next visit of one claimed plan.
 */
const processPlan = async (plan) => {
  // Required lazily: bookingCreationService pulls in the notification and
  // socket layers, which are not needed when this module is only imported.
  const { placeBooking } = require('./bookingCreationService');

  if (plan.occurrencesCreated >= plan.occurrencesPlanned || !plan.nextOccurrenceAt) {
    plan.status = RECURRING_STATUS.COMPLETED;
    plan.nextOccurrenceAt = null;
    return;
  }

  const visitDate = new Date(plan.nextOccurrenceAt);

  if (Date.now() - visitDate.getTime() > MISSED_AFTER_MS) {
    plan.lastError = `Visit on ${formatDate(visitDate)} was skipped because it could not be booked in time`;
    notifyUser(plan, {
      type: 'recurring_booking_failed',
      title: 'Recurring visit skipped',
      message: `Your ${plan.serviceName} visit on ${formatDate(visitDate)} could not be booked in time and was skipped.`
    });
    advance(plan);
    return;
  }

  const payload = {
    ...plan.bookingTemplate,
    bookingType: 'scheduled',
    scheduledDate: visitDate.toISOString(),
    scheduledTime: plan.scheduledTime,
    timeSlot: { start: plan.timeSlot.start, end: plan.timeSlot.end }
  };

  plan.preferredWorkerId = await preferredWorkerFor(plan);

  const result = await placeBooking(plan.userId, payload, {
    recurringContext: {
      recurringBookingId: plan._id,
      discountPercentage: plan.discountPercentage || 0,
      preferredWorkerId: plan.preferredWorkerId
    }
  });

  if (result.statusCode === 201) {
    advance(plan, { bookingId: result.booking._id });
    plan.lastError = null;
    // Alert workers and notify the customer now (there is no HTTP response to wait for).
    if (result.afterResponse) await result.afterResponse();
    return;
  }

  plan.failedAttempts = (plan.failedAttempts || 0) + 1;
  plan.lastError = result.body?.message || 'Could not book this visit';
  console.warn(`[Recurring] Plan ${plan._id} attempt ${plan.failedAttempts} failed: ${plan.lastError}`);

  if (plan.failedAttempts >= MAX_ATTEMPTS) {
    notifyUser(plan, {
      type: 'recurring_booking_failed',
      title: 'Recurring visit could not be booked',
      message: `We could not book your ${plan.serviceName} visit on ${formatDate(visitDate)}: ${plan.lastError}`
    });
    advance(plan);
  }
};

/**
 * Books every visit that has come within the lead time.
 */
const runDueRecurringBookings = async () => {
  const config = await getBookingConfig();
  if (!config.isRecurringEnabled) return 0;

  const now = new Date();
  const horizon = new Date(now.getTime() + config.recurringLeadHours * 60 * 60 * 1000);
  let processed = 0;

  const due = await RecurringBooking.find({
    status: RECURRING_STATUS.ACTIVE,
    nextOccurrenceAt: { $ne: null, $lte: horizon },
    $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }]
  })
    .select('_id')
    .limit(BATCH_SIZE)
    .lean();

  for (const { _id } of due) {
    // Claim the plan so another instance does not book the same visit.
    const plan = await RecurringBooking.findOneAndUpdate(
      {
        _id,
        status: RECURRING_STATUS.ACTIVE,
        $or: [{ lockedUntil: null }, { lockedUntil: { $lt: new Date() } }]
      },
      { $set: { lockedUntil: new Date(Date.now() + LOCK_MS) } },
      { new: true }
    );
    if (!plan) continue;

    try {
      await processPlan(plan);
    } catch (error) {
      plan.failedAttempts = (plan.failedAttempts || 0) + 1;
      plan.lastError = error.message;
      console.error(`[Recurring] Plan ${plan._id} failed:`, error);
    } finally {
      plan.lockedUntil = null;
      plan.lastRunAt = new Date();
      await plan.save().catch((err) => console.error('[Recurring] Failed to save plan:', err.message));
      processed += 1;
    }
  }

  return processed;
};

/**
 * Next visit date on or after now, used when a paused plan is resumed so
 * visits that fell inside the pause are not booked in the past.
 */
const rollForward = (plan) => {
  let next = plan.nextOccurrenceAt ? new Date(plan.nextOccurrenceAt) : new Date();
  const now = Date.now();
  let guard = 0;
  while (next.getTime() < now && guard < 120) {
    next = nextOccurrenceDate(next, plan.frequency);
    guard += 1;
  }
  return next;
};

let timer = null;

const initializeRecurringRunner = () => {
  if (timer) return;
  const tick = () => runDueRecurringBookings()
    .then((n) => { if (n) console.log(`[Recurring] Processed ${n} plan(s)`); })
    .catch((err) => console.error('[Recurring] Runner error:', err));

  // First run shortly after boot, once the database is connected.
  setTimeout(tick, 30 * 1000);
  timer = setInterval(tick, RUN_INTERVAL_MS);
  console.log('[Recurring] Runner initialized (every 5 min)');
};

module.exports = {
  runDueRecurringBookings,
  initializeRecurringRunner,
  rollForward
};
