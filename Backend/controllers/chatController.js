/**
 * Booking Chat Controller
 *
 * Messages between a customer and the worker assigned to their booking.
 * The same handlers serve both apps; the caller's role decides which side of
 * the conversation they are on.
 *
 *   GET  /api/users/bookings/:id/chat        GET  /api/workers/bookings/:id/chat
 *   POST /api/users/bookings/:id/chat        POST /api/workers/bookings/:id/chat
 *   POST /api/users/bookings/:id/chat/read   POST /api/workers/bookings/:id/chat/read
 *   GET  /api/admin/bookings/:id/chat        (read-only, for support)
 */

const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const ChatMessage = require('../models/ChatMessage');
const { USER_ROLES, BOOKING_STATUS } = require('../utils/constants');
const { getBookingConfig } = require('../utils/bookingConfig');
const cloudinaryService = require('../services/cloudinaryService');
const { createNotification } = require('./notificationControllers/notificationController');

const PAGE_SIZE = 50;
const MAX_MESSAGES_PER_MINUTE = 20;

const roleOf = (req) => (req.userRole === USER_ROLES.WORKER ? 'worker' : 'user');

// Runs of 10+ digits (optionally spaced or dashed) look like phone numbers.
const PHONE_PATTERN = /(?:\+?\d[\s-]?){9,14}\d/g;
const maskPhoneNumbers = (text) => text.replace(PHONE_PATTERN, (match) =>
  (match.replace(/\D/g, '').length >= 10 ? '[number hidden]' : match));

const loadBooking = (req) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  const owner = roleOf(req) === 'worker' ? { vendorId: req.user.id } : { userId: req.user.id };
  return Booking.findOne({ _id: id, ...owner })
    .select('userId vendorId status completedAt cancelledAt updatedAt bookingNumber serviceName')
    .populate('userId', 'name profilePhoto')
    .populate('vendorId', 'name businessName profilePhoto')
    .lean();
};

/**
 * Whether messages can be sent on a booking right now, and why not if not.
 */
const chatState = (booking, config) => {
  if (!config.isChatEnabled) {
    return { enabled: false, canSend: false, reason: 'Chat is currently unavailable.' };
  }
  if (!booking.vendorId) {
    return { enabled: true, canSend: false, reason: 'Chat opens once a professional accepts the booking.' };
  }

  const closeMs = config.chatCloseAfterHours * 60 * 60 * 1000;
  let endedAt = null;
  if ([BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED].includes(booking.status)) {
    endedAt = booking.cancelledAt || booking.updatedAt;
  } else if (booking.status === BOOKING_STATUS.COMPLETED) {
    endedAt = booking.completedAt || booking.updatedAt;
  }

  if (endedAt && Date.now() - new Date(endedAt).getTime() > closeMs) {
    return { enabled: true, canSend: false, reason: 'This chat has closed because the booking has ended.' };
  }
  return { enabled: true, canSend: true, reason: null };
};

const counterpartOf = (booking, role) => {
  if (role === 'worker') {
    return { name: booking.userId?.name || 'Customer', photo: booking.userId?.profilePhoto || null };
  }
  const worker = booking.vendorId || {};
  return { name: worker.businessName || worker.name || 'Professional', photo: worker.profilePhoto || null };
};

const emitToBoth = (booking, event, payload) => {
  try {
    const { getIO } = require('../sockets');
    const io = getIO();
    const userId = booking.userId?._id || booking.userId;
    const workerId = booking.vendorId?._id || booking.vendorId;
    if (userId) io.to(`user_${userId}`).emit(event, payload);
    if (workerId) io.to(`vendor_${workerId}`).emit(event, payload);
  } catch (_) {
    // Socket delivery is best-effort; the message is already saved.
  }
};

/**
 * Marks the other party's messages as read and tells them.
 */
const markRead = async (booking, role) => {
  const otherSide = role === 'worker' ? 'user' : 'worker';
  const result = await ChatMessage.updateMany(
    { bookingId: booking._id, senderType: otherSide, readAt: null },
    { $set: { readAt: new Date() } }
  );
  if (result.modifiedCount > 0) {
    emitToBoth(booking, 'chat_read', { bookingId: String(booking._id), readBy: role, readAt: new Date() });
  }
  return result.modifiedCount;
};

exports.getChat = async (req, res) => {
  try {
    const booking = await loadBooking(req);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const role = roleOf(req);
    const config = await getBookingConfig();

    // Older pages are fetched with ?before=<messageId>.
    const query = { bookingId: booking._id };
    if (req.query.before && mongoose.Types.ObjectId.isValid(req.query.before)) {
      query._id = { $lt: new mongoose.Types.ObjectId(req.query.before) };
    }

    const page = await ChatMessage.find(query)
      .sort({ _id: -1 })
      .limit(PAGE_SIZE + 1)
      .lean();
    const hasMore = page.length > PAGE_SIZE;
    const messages = page.slice(0, PAGE_SIZE).reverse();

    if (req.query.markRead !== 'false') await markRead(booking, role);

    res.status(200).json({
      success: true,
      data: {
        messages,
        hasMore,
        chat: {
          ...chatState(booking, config),
          imageEnabled: config.isChatImageEnabled,
          me: role,
          counterpart: counterpartOf(booking, role),
          bookingNumber: booking.bookingNumber,
          serviceName: booking.serviceName
        }
      }
    });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ success: false, message: 'Failed to load chat' });
  }
};

exports.sendChatMessage = async (req, res) => {
  try {
    const booking = await loadBooking(req);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const role = roleOf(req);
    const config = await getBookingConfig();
    const state = chatState(booking, config);
    if (!state.canSend) return res.status(403).json({ success: false, code: 'CHAT_CLOSED', message: state.reason });

    let text = typeof req.body.message === 'string' ? req.body.message.trim().slice(0, 1000) : '';
    const image = req.body.image;

    if (!text && !image) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }

    // Simple flood protection per sender and booking.
    const recentCount = await ChatMessage.countDocuments({
      bookingId: booking._id,
      senderType: role,
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) }
    });
    if (recentCount >= MAX_MESSAGES_PER_MINUTE) {
      return res.status(429).json({ success: false, message: 'You are sending messages too quickly. Please wait a moment.' });
    }

    if (config.chatMaskPhoneNumbers && text) text = maskPhoneNumbers(text);

    const attachments = [];
    if (image) {
      if (!config.isChatImageEnabled) {
        return res.status(403).json({ success: false, message: 'Sending photos is currently disabled' });
      }
      if (typeof image !== 'string' || !/^data:image\/(jpeg|jpg|png|webp);base64,/.test(image)) {
        return res.status(400).json({ success: false, message: 'Please send a JPG, PNG or WEBP image' });
      }
      if (image.length > 7.5 * 1024 * 1024) {
        return res.status(400).json({ success: false, message: 'Photo is too large. Maximum size is 5MB.' });
      }
      const upload = await cloudinaryService.uploadFile(image, {
        folder: `bookings/chat/${booking._id}`,
        resource_type: 'image',
        transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto:good' }]
      });
      if (!upload.success) {
        return res.status(502).json({ success: false, message: 'Failed to upload photo. Please try again.' });
      }
      attachments.push({ url: upload.url, type: 'image' });
    }

    const message = await ChatMessage.create({
      bookingId: booking._id,
      senderType: role,
      senderId: req.user.id,
      message: text,
      attachments
    });

    const payload = { bookingId: String(booking._id), message: message.toObject() };
    emitToBoth(booking, 'chat_message', payload);

    // Push to the other side so they see it with the app closed.
    const senderName = role === 'worker'
      ? (booking.vendorId?.businessName || booking.vendorId?.name || 'Your professional')
      : (booking.userId?.name || 'Customer');
    const preview = text ? text.slice(0, 80) : '📷 Photo';
    const recipient = role === 'worker'
      ? { userId: booking.userId?._id || booking.userId, link: `/user/booking/${booking._id}?chat=1` }
      : { vendorId: booking.vendorId?._id || booking.vendorId, link: `/worker/booking/${booking._id}?chat=1` };

    createNotification({
      ...(recipient.userId ? { userId: recipient.userId } : { vendorId: recipient.vendorId }),
      type: 'chat_message',
      title: `Message from ${senderName}`,
      message: preview,
      relatedId: booking._id,
      relatedType: 'booking',
      data: { bookingId: String(booking._id), chat: true },
      pushData: { type: 'chat_message', bookingId: String(booking._id), link: recipient.link }
    }).catch((err) => console.error('[Chat] Notification failed:', err.message));

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('Send chat message error:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

exports.markChatRead = async (req, res) => {
  try {
    const booking = await loadBooking(req);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const updated = await markRead(booking, roleOf(req));
    res.status(200).json({ success: true, updated });
  } catch (error) {
    console.error('Mark chat read error:', error);
    res.status(500).json({ success: false, message: 'Failed to update chat' });
  }
};

/**
 * Unread message count for a booking, for the chat button badge.
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const booking = await loadBooking(req);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const otherSide = roleOf(req) === 'worker' ? 'user' : 'worker';
    const unread = await ChatMessage.countDocuments({ bookingId: booking._id, senderType: otherSide, readAt: null });
    res.status(200).json({ success: true, unread });
  } catch (error) {
    console.error('Chat unread count error:', error);
    res.status(500).json({ success: false, message: 'Failed to load unread count' });
  }
};

/**
 * Admin: read a booking's chat (support and dispute investigation).
 */
exports.getChatForAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    const messages = await ChatMessage.find({ bookingId: id }).sort({ _id: 1 }).limit(1000).lean();
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    console.error('Admin get chat error:', error);
    res.status(500).json({ success: false, message: 'Failed to load chat' });
  }
};
