const mongoose = require('mongoose');

/**
 * ChatMessage Model
 *
 * A message between the customer and the worker assigned to a booking. Every
 * chat is scoped to one booking, so there is no separate conversation
 * document: the booking is the conversation.
 */
const chatMessageSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  senderType: {
    type: String,
    enum: ['user', 'worker', 'system'],
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  message: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  attachments: [{
    _id: false,
    url: { type: String, required: true },
    type: { type: String, enum: ['image'], default: 'image' }
  }],
  // Set when the other party opens the chat.
  readAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

chatMessageSchema.index({ bookingId: 1, createdAt: 1 });
chatMessageSchema.index({ bookingId: 1, senderType: 1, readAt: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
