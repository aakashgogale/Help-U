const mongoose = require('mongoose');

/**
 * A message sent from the customer app's Help & Support page or the landing page's contact form.
 * Admins read and resolve them in Admin > Support Messages.
 */
const supportMessageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, trim: true, lowercase: true, maxlength: 150, default: '' },
  phone: { type: String, trim: true, maxlength: 30, default: '' },
  subject: { type: String, trim: true, maxlength: 150, default: '' },
  message: { type: String, required: true, trim: true, maxlength: 3000 },
  source: { type: String, enum: ['help_support', 'landing'], default: 'help_support' },
  // Set when the sender was signed in
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['new', 'in_progress', 'resolved'], default: 'new', index: true },
  adminNote: { type: String, trim: true, maxlength: 1000, default: '' },
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  handledAt: { type: Date, default: null }
}, { timestamps: true });

supportMessageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SupportMessage', supportMessageSchema);
