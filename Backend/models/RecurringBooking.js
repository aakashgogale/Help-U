const mongoose = require('mongoose');
const { RECURRING_STATUS } = require('../utils/constants');

/**
 * RecurringBooking Model
 *
 * A repeating service plan, e.g. "Home cleaning every week, 8 visits". The
 * first visit is booked at checkout like any booking; the recurring runner
 * (services/recurringBookingService.js) books each later visit
 * Settings.recurringLeadHours before it is due, reusing bookingTemplate.
 */
const recurringBookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserService',
    required: true
  },
  serviceName: {
    type: String,
    default: ''
  },
  serviceCategory: {
    type: String,
    default: ''
  },
  categoryIcon: {
    type: String,
    default: null
  },
  frequency: {
    type: String,
    enum: ['weekly', 'biweekly', 'monthly'],
    required: true
  },
  // Visits in the plan, including the first one booked at checkout.
  occurrencesPlanned: {
    type: Number,
    required: true,
    min: 2,
    max: 52
  },
  occurrencesCreated: {
    type: Number,
    default: 1
  },
  // Date (and slot) of the next visit to be booked.
  nextOccurrenceAt: {
    type: Date,
    default: null,
    index: true
  },
  scheduledTime: {
    type: String,
    required: true
  },
  timeSlot: {
    start: { type: String, required: true },
    end: { type: String, required: true }
  },
  // The createBooking payload of the first visit, minus the scheduling fields,
  // replayed for every later visit.
  bookingTemplate: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  // Discount percentage locked in when the plan was created.
  discountPercentage: {
    type: Number,
    default: 0
  },
  // Worker of the most recent completed visit, alerted first next time so the
  // customer keeps the same professional where possible.
  preferredWorkerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    default: null
  },
  bookingIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  }],
  status: {
    type: String,
    enum: Object.values(RECURRING_STATUS),
    default: RECURRING_STATUS.ACTIVE,
    index: true
  },
  // Set while the runner books a visit so two runners never book it twice.
  lockedUntil: {
    type: Date,
    default: null
  },
  lastRunAt: {
    type: Date,
    default: null
  },
  lastError: {
    type: String,
    default: null
  },
  failedAttempts: {
    type: Number,
    default: 0
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancelledBy: {
    type: String,
    enum: ['user', 'admin', 'system', null],
    default: null
  }
}, { timestamps: true });

recurringBookingSchema.index({ status: 1, nextOccurrenceAt: 1 });

module.exports = mongoose.model('RecurringBooking', recurringBookingSchema);
