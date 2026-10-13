const mongoose = require('mongoose');
const { DISPUTE_STATUS } = require('../utils/constants');

/**
 * Dispute Model
 *
 * A complaint about a booking, raised by the customer or the worker and
 * resolved by an admin. The thread holds every message and piece of evidence
 * so the whole case can be reviewed in one place; resolution records any
 * refund to the customer and penalty on the worker.
 */
const attachmentSchema = new mongoose.Schema({
  url: { type: String, required: true },
  type: { type: String, enum: ['image', 'video'], default: 'image' }
}, { _id: false });

const messageSchema = new mongoose.Schema({
  senderType: {
    type: String,
    enum: ['user', 'worker', 'admin', 'system'],
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  senderName: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: ''
  },
  attachments: {
    type: [attachmentSchema],
    default: []
  },
  // Internal admin notes are never shown to the customer or the worker.
  isInternal: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const disputeSchema = new mongoose.Schema({
  disputeNumber: {
    type: String,
    unique: true,
    required: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    default: null,
    index: true
  },
  raisedBy: {
    type: String,
    enum: ['user', 'worker'],
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  evidence: {
    type: [attachmentSchema],
    default: []
  },
  // What the person raising it asked for, in rupees. Informational only; the
  // admin decides the actual refund.
  requestedRefund: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: Object.values(DISPUTE_STATUS),
    default: DISPUTE_STATUS.OPEN,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  messages: {
    type: [messageSchema],
    default: []
  },
  // Snapshot of the amount the customer had paid when the dispute was raised.
  amountPaid: {
    type: Number,
    default: 0
  },
  resolution: {
    outcome: {
      type: String,
      enum: ['favour_user', 'favour_worker', 'partial', 'no_action', null],
      default: null
    },
    refundAmount: { type: Number, default: 0, min: 0 },
    refundMethod: {
      type: String,
      enum: ['none', 'wallet', 'original'],
      default: 'none'
    },
    refundReference: { type: String, default: null },
    workerPenalty: { type: Number, default: 0, min: 0 },
    note: { type: String, default: '' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    resolvedAt: { type: Date, default: null }
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  // Bumped on every message so lists can sort by latest activity.
  lastActivityAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: true });

disputeSchema.index({ status: 1, createdAt: -1 });
disputeSchema.index({ bookingId: 1, status: 1 });

module.exports = mongoose.model('Dispute', disputeSchema);
