const SupportMessage = require('../models/SupportMessage');
const Admin = require('../models/Admin');
const { createNotification } = require('./notificationControllers/notificationController');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/public/support-message  (also used by POST /api/public/contact-inquiry)
 * Stores the message and tells the admins. Needs a name, a message and a way to reply (email or phone).
 */
const submitSupportMessage = (source) => async (req, res) => {
  try {
    const { name, email, phone, subject, message, website } = req.body || {};

    // Hidden field a real person never fills in: silently accept, store nothing
    if (website) return res.status(200).json({ success: true, message: 'Thank you! We have received your message.' });

    const clean = {
      name: String(name || '').trim(),
      email: String(email || '').trim(),
      phone: String(phone || '').trim(),
      subject: String(subject || '').trim(),
      message: String(message || '').trim()
    };

    if (!clean.name || !clean.message) {
      return res.status(400).json({ success: false, message: 'Please enter your name and your message.' });
    }
    if (!clean.email && !clean.phone) {
      return res.status(400).json({ success: false, message: 'Please add an email or phone number so we can reply.' });
    }
    if (clean.email && !EMAIL_RE.test(clean.email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }
    if (clean.message.length < 5) {
      return res.status(400).json({ success: false, message: 'Please write a little more so we can help.' });
    }

    const saved = await SupportMessage.create({
      ...clean,
      source,
      userId: req.user?.id || null
    });

    // Tell the admins; a notification problem must not fail the customer's message
    try {
      const admins = await Admin.find({}).select('_id');
      await Promise.all(admins.map((a) => createNotification({
        adminId: a._id,
        type: 'support_message',
        title: 'New support message',
        message: `${clean.name}: ${clean.subject || clean.message.slice(0, 80)}`,
        relatedId: saved._id,
        relatedType: 'user'
      })));
    } catch (err) {
      console.error('[Support] Could not notify admins:', err.message);
    }

    res.status(201).json({ success: true, message: 'Thank you! We have received your message and will get back to you soon.' });
  } catch (error) {
    console.error('Submit support message error:', error);
    res.status(500).json({ success: false, message: 'Could not send your message. Please try again.' });
  }
};

/** GET /api/admin/support-messages?status=&page=&limit= */
const listSupportMessages = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = ['new', 'in_progress', 'resolved'].includes(status) ? { status } : {};
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const [rows, total, counts] = await Promise.all([
      SupportMessage.find(query).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).populate('userId', 'name phone').lean(),
      SupportMessage.countDocuments(query),
      SupportMessage.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }])
    ]);
    const byStatus = Object.fromEntries(counts.map((c) => [c._id, c.n]));
    res.json({ success: true, data: rows, counts: { new: byStatus.new || 0, in_progress: byStatus.in_progress || 0, resolved: byStatus.resolved || 0 }, pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) } });
  } catch (error) {
    console.error('List support messages error:', error);
    res.status(500).json({ success: false, message: 'Failed to load support messages' });
  }
};

/** PUT /api/admin/support-messages/:id  { status?, adminNote? } */
const updateSupportMessage = async (req, res) => {
  try {
    const { status, adminNote } = req.body || {};
    const update = {};
    if (status !== undefined) {
      if (!['new', 'in_progress', 'resolved'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
      update.status = status;
      update.handledBy = req.user?.id || null;
      update.handledAt = new Date();
    }
    if (adminNote !== undefined) update.adminNote = String(adminNote).trim().slice(0, 1000);
    if (Object.keys(update).length === 0) return res.status(400).json({ success: false, message: 'Nothing to update' });

    const doc = await SupportMessage.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Message not found' });
    res.json({ success: true, data: doc });
  } catch (error) {
    console.error('Update support message error:', error);
    res.status(500).json({ success: false, message: 'Failed to update the message' });
  }
};

module.exports = { submitSupportMessage, listSupportMessages, updateSupportMessage };
