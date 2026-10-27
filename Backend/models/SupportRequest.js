const mongoose = require('mongoose');

/**
 * A message sent through a "Contact us" form: the customer app's Help & Support, or the landing
 * page. Admins read and resolve these in Admin > Support Requests.
 */
const supportRequestSchema = new mongoose.Schema({
  source: { type: String, enum: ['app', 'landing'], default: 'app' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, trim: true, lowercase: true, maxlength: 120, default: '' },
  phone: { type: String, trim: true, maxlength: 20, default: '' },
  subject: { type: String, trim: true, maxlength: 150, default: '' },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  status: { type: String, enum: ['new', 'in_progress', 'resolved'], default: 'new', index: true },
  adminNote: { type: String, trim: true, maxlength: 1000, default: '' },
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  resolvedAt: { type: Date, default: null }
}, { timestamps: true });

supportRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SupportRequest', supportRequestSchema);
