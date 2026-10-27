const SupportRequest = require('../models/SupportRequest');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { createNotification } = require('./notificationControllers/notificationController');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clip = (v, n) => String(v || '').trim().slice(0, n);

// Checks and cleans what a visitor typed. Returns { fields } or { error }.
const readForm = (body) => {
  const name = clip(body.name, 80);
  const email = clip(body.email, 120).toLowerCase();
  const phone = clip(body.phone, 20);
  const subject = clip(body.subject, 150);
  const message = clip(body.message, 2000);

  if (!name) return { error: 'Please enter your name.' };
  if (!email && !phone) return { error: 'Please give an email or a phone number so we can reply.' };
  if (email && !EMAIL_RE.test(email)) return { error: 'Please enter a valid email address.' };
  if (phone && phone.replace(/\D/g, '').length < 7) return { error: 'Please enter a valid phone number.' };
  if (message.length < 5) return { error: 'Please write a short message.' };
  return { fields: { name, email, phone, subject, message } };
};

const save = async (req, res, source, userId = null) => {
  const { fields, error } = readForm(req.body || {});
  if (error) return res.status(400).json({ success: false, message: error });

  const request = await SupportRequest.create({ ...fields, source, userId });

  // Tell the admins; a failure here never loses the saved message
  try {
    const admins = await Admin.find({}).select('_id').lean();
    await Promise.all(admins.map((a) => createNotification({
      adminId: a._id,
      type: 'support_request',
      title: 'New support request',
      message: `${fields.name}: ${fields.subject || fields.message.slice(0, 80)}`,
      relatedId: request._id,
      relatedType: 'support'
    })));
  } catch (err) {
    console.error('[Support] Could not notify admins:', err.message);
  }

  return res.status(201).json({ success: true, message: 'Thank you! Your message has been sent to our support team. We will get back to you soon.' });
};

/** POST /api/public/contact-inquiry: the landing page form (no login) */
exports.submitLandingInquiry = async (req, res) => {
  try {
    await save(req, res, 'landing');
  } catch (error) {
    console.error('Landing inquiry error:', error);
    res.status(500).json({ success: false, message: 'Failed to send message. Please try again.' });
  }
};

/** POST /api/users/support-requests: the app's Help & Support form (signed-in customer) */
exports.submitAppRequest = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('name phone email').lean();
    // Fill what the customer left blank from their profile, so they need not retype it
    req.body = { name: user?.name, email: user?.email, phone: user?.phone, ...Object.fromEntries(Object.entries(req.body || {}).filter(([, v]) => String(v || '').trim() !== '')) };
    await save(req, res, 'app', req.user.id);
  } catch (error) {
    console.error('App support request error:', error);
    res.status(500).json({ success: false, message: 'Failed to send message. Please try again.' });
  }
};

/** GET /api/admin/support-requests?status=new|in_progress|resolved&page=&limit= */
exports.adminList = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = ['new', 'in_progress', 'resolved'].includes(status) ? { status } : {};
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const [data, total, counts] = await Promise.all([
      SupportRequest.find(query).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).populate('userId', 'name phone').lean(),
      SupportRequest.countDocuments(query),
      SupportRequest.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }])
    ]);
    const byStatus = { new: 0, in_progress: 0, resolved: 0 };
    counts.forEach((c) => { byStatus[c._id] = c.n; });
    res.json({ success: true, data, counts: byStatus, pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) } });
  } catch (error) {
    console.error('Admin support list error:', error);
    res.status(500).json({ success: false, message: 'Failed to load support requests' });
  }
};

/** PUT /api/admin/support-requests/:id  body { status?, adminNote? } */
exports.adminUpdate = async (req, res) => {
  try {
    const request = await SupportRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Support request not found' });

    const { status, adminNote } = req.body || {};
    if (status !== undefined) {
      if (!['new', 'in_progress', 'resolved'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
      request.status = status;
      request.resolvedAt = status === 'resolved' ? new Date() : null;
    }
    if (adminNote !== undefined) request.adminNote = clip(adminNote, 1000);
    request.handledBy = req.user?.id || null;
    await request.save();
    res.json({ success: true, data: request });
  } catch (error) {
    console.error('Admin support update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update the request' });
  }
};
