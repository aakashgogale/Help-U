/**
 * Recurring Booking Controller
 *
 *   User:  GET  /api/users/recurring-bookings
 *          GET  /api/users/recurring-bookings/:id
 *          POST /api/users/recurring-bookings/:id/(pause|resume|cancel)
 *   Admin: GET  /api/admin/recurring-bookings
 *          POST /api/admin/recurring-bookings/:id/(pause|resume|cancel)
 *
 * Plans are created at checkout (bookingCreationService), not here.
 */

const mongoose = require('mongoose');
const RecurringBooking = require('../models/RecurringBooking');
const { RECURRING_STATUS } = require('../utils/constants');
const { rollForward } = require('../services/recurringBookingService');

const BOOKING_FIELDS = 'bookingNumber status scheduledDate scheduledTime finalAmount vendorId';

const isId = (v) => mongoose.Types.ObjectId.isValid(String(v || ''));

/**
 * Applies pause / resume / cancel to a plan. Returns { plan, error }.
 */
const applyAction = async (plan, action, actor) => {
  const finished = [RECURRING_STATUS.CANCELLED, RECURRING_STATUS.COMPLETED].includes(plan.status);
  if (finished) return { error: 'This plan has already ended' };

  if (action === 'pause') {
    if (plan.status === RECURRING_STATUS.PAUSED) return { error: 'This plan is already paused' };
    plan.status = RECURRING_STATUS.PAUSED;
  } else if (action === 'resume') {
    if (plan.status !== RECURRING_STATUS.PAUSED) return { error: 'Only a paused plan can be resumed' };
    plan.status = RECURRING_STATUS.ACTIVE;
    plan.nextOccurrenceAt = rollForward(plan);
    plan.failedAttempts = 0;
    plan.lastError = null;
  } else if (action === 'cancel') {
    plan.status = RECURRING_STATUS.CANCELLED;
    plan.nextOccurrenceAt = null;
    plan.cancelledAt = new Date();
    plan.cancelledBy = actor;
  } else {
    return { error: 'Unknown action' };
  }

  await plan.save();
  return { plan };
};

// ── User ───────────────────────────────────────────────────────────

exports.listMyPlans = async (req, res) => {
  try {
    const query = { userId: req.user.id };
    if (Object.values(RECURRING_STATUS).includes(req.query.status)) query.status = req.query.status;

    const plans = await RecurringBooking.find(query)
      .select('-bookingTemplate -lockedUntil')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.status(200).json({ success: true, data: plans });
  } catch (error) {
    console.error('List recurring plans error:', error);
    res.status(500).json({ success: false, message: 'Failed to load recurring bookings' });
  }
};

exports.getMyPlan = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ success: false, message: 'Plan not found' });
    const plan = await RecurringBooking.findOne({ _id: req.params.id, userId: req.user.id })
      .select('-lockedUntil')
      .populate({ path: 'bookingIds', select: BOOKING_FIELDS, populate: { path: 'vendorId', select: 'name businessName' } })
      .lean();
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    // The template holds the address and items, useful for display; prices in
    // it are the checkout inputs, not what each visit cost.
    const { bookingTemplate = {}, ...rest } = plan;
    res.status(200).json({
      success: true,
      data: {
        ...rest,
        address: bookingTemplate.address || null,
        addOns: bookingTemplate.addOns || [],
        customerNotes: bookingTemplate.customerNotes || null
      }
    });
  } catch (error) {
    console.error('Get recurring plan error:', error);
    res.status(500).json({ success: false, message: 'Failed to load recurring booking' });
  }
};

exports.updateMyPlan = (action) => async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ success: false, message: 'Plan not found' });
    const plan = await RecurringBooking.findOne({ _id: req.params.id, userId: req.user.id });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    const { error } = await applyAction(plan, action, 'user');
    if (error) return res.status(400).json({ success: false, message: error });

    const messages = {
      pause: 'Recurring booking paused. No new visits will be booked until you resume.',
      resume: 'Recurring booking resumed.',
      cancel: 'Recurring booking cancelled. Visits already booked are not affected.'
    };
    res.status(200).json({ success: true, message: messages[action], data: plan });
  } catch (error) {
    console.error(`Recurring ${action} error:`, error);
    res.status(500).json({ success: false, message: 'Failed to update recurring booking' });
  }
};

// ── Admin ──────────────────────────────────────────────────────────

exports.adminListPlans = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const query = {};
    if (Object.values(RECURRING_STATUS).includes(req.query.status)) query.status = req.query.status;
    if (['weekly', 'biweekly', 'monthly'].includes(req.query.frequency)) query.frequency = req.query.frequency;

    const [items, total, counts] = await Promise.all([
      RecurringBooking.find(query)
        .select('-bookingTemplate -lockedUntil')
        .populate('userId', 'name phone')
        .populate('preferredWorkerId', 'name businessName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      RecurringBooking.countDocuments(query),
      RecurringBooking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
    ]);

    const stats = Object.fromEntries(Object.values(RECURRING_STATUS).map((s) => [s, 0]));
    counts.forEach((c) => { stats[c._id] = c.count; });

    res.status(200).json({ success: true, data: items, stats, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Admin list recurring plans error:', error);
    res.status(500).json({ success: false, message: 'Failed to load recurring bookings' });
  }
};

exports.adminUpdatePlan = (action) => async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ success: false, message: 'Plan not found' });
    const plan = await RecurringBooking.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    const { error } = await applyAction(plan, action, 'admin');
    if (error) return res.status(400).json({ success: false, message: error });

    res.status(200).json({ success: true, message: 'Recurring booking updated', data: plan });
  } catch (error) {
    console.error(`Admin recurring ${action} error:`, error);
    res.status(500).json({ success: false, message: 'Failed to update recurring booking' });
  }
};
