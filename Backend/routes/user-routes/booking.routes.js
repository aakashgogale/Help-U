const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authMiddleware');
const { isUser } = require('../../middleware/roleMiddleware');
const { validatePaymentMethod, validateBookingType } = require('../../middleware/featureGuard');
const {
  createBooking,
  uploadIssuePhoto,
  uploadIssueVideo,
  getUserBookings,
  getBookingById,
  cancelBooking,
  rescheduleBooking,
  addReview,
  getUserRatings
} = require('../../controllers/bookingControllers/userBookingController');
const { getChat, sendChatMessage, markChatRead, getUnreadCount } = require('../../controllers/chatController');
const { getExtraServices, updateExtraServices } = require('../../controllers/bookingControllers/bookingExtraServicesController');
const { MAX_ISSUE_PHOTOS, MAX_ISSUE_VIDEOS } = require('../../utils/issuePhotos');
const { uploadVideoToTemp } = require('../../middleware/uploadMiddleware');

// Multer errors (size, type) are answered here rather than falling through to
// the generic error handler, whose size message assumes 5MB images.
const receiveVideo = (req, res, next) => {
  uploadVideoToTemp(req, res, (err) => {
    if (!err) return next();
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Video is too large.'
      : (err.message || 'Video upload failed');
    return res.status(400).json({ success: false, message });
  });
};

// Validation rules
const createBookingValidation = [
  body('serviceId').isMongoId().withMessage('Valid service ID is required'),
  body('vendorId').optional().custom((value) => {
    if (value && !/^[0-9a-fA-F]{24}$/.test(value)) {
      throw new Error('Valid worker ID is required');
    }
    return true;
  }),
  body('address.addressLine1').trim().notEmpty().withMessage('Address line 1 is required'),
  body('address.city').trim().notEmpty().withMessage('City is required'),
  body('address.state').trim().notEmpty().withMessage('State is required'),
  body('address.pincode').trim().notEmpty().withMessage('Pincode is required'),
  body('scheduledDate').isISO8601().withMessage('Valid scheduled date is required'),
  body('scheduledTime').trim().notEmpty().withMessage('Scheduled time is required'),
  body('timeSlot.start').trim().notEmpty().withMessage('Time slot start is required'),
  body('timeSlot.end').trim().notEmpty().withMessage('Time slot end is required'),
  body('issuePhotos').optional().isArray({ max: MAX_ISSUE_PHOTOS }).withMessage(`You can attach up to ${MAX_ISSUE_PHOTOS} photos`),
  body('issueVideos').optional().isArray({ max: MAX_ISSUE_VIDEOS }).withMessage(`You can attach up to ${MAX_ISSUE_VIDEOS} videos`),
  body('customerNotes').optional({ nullable: true }).isString().isLength({ max: 2000 }).withMessage('Notes are too long'),
  body('addOns').optional().isArray({ max: 30 }).withMessage('Invalid add-ons'),
  body('isEmergency').optional().isBoolean().withMessage('Invalid emergency flag'),
  body('recurring.frequency').optional().isIn(['weekly', 'biweekly', 'monthly']).withMessage('Invalid repeat frequency'),
  body('recurring.occurrences').optional().isInt({ min: 2, max: 52 }).withMessage('Invalid number of visits')
];

const cancelBookingValidation = [
  body('cancellationReason').optional().trim()
];

const rescheduleBookingValidation = [
  body('scheduledDate').isISO8601().withMessage('Valid scheduled date is required'),
  body('scheduledTime').trim().notEmpty().withMessage('Scheduled time is required'),
  body('timeSlot.start').trim().notEmpty().withMessage('Time slot start is required'),
  body('timeSlot.end').trim().notEmpty().withMessage('Time slot end is required')
];

const addReviewValidation = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('review').optional().trim(),
  body('reviewImages').optional().isArray().withMessage('Review images must be an array')
];

// Routes
router.get('/ratings', authenticate, isUser, getUserRatings);
router.post(
  '/',
  authenticate,
  isUser,
  validateBookingType,
  validatePaymentMethod,
  createBookingValidation,
  createBooking
);
router.post('/issue-photos', authenticate, isUser, uploadIssuePhoto);
router.post('/issue-videos', authenticate, isUser, receiveVideo, uploadIssueVideo);
router.get('/', authenticate, isUser, getUserBookings);
router.get('/:id', authenticate, isUser, getBookingById);

// Chat with the assigned worker
router.get('/:id/chat', authenticate, isUser, getChat);
router.get('/:id/chat/unread', authenticate, isUser, getUnreadCount);
router.post('/:id/chat', authenticate, isUser, body('message').optional().isString().isLength({ max: 1000 }), sendChatMessage);
router.post('/:id/chat/read', authenticate, isUser, markChatRead);
// Repair services the customer adds after the professional's inspection
router.get('/:id/extra-services', authenticate, isUser, getExtraServices);
router.put('/:id/extra-services', authenticate, isUser, updateExtraServices);
router.post('/:id/cancel', authenticate, isUser, cancelBookingValidation, cancelBooking);
router.put('/:id/reschedule', authenticate, isUser, rescheduleBookingValidation, rescheduleBooking);
router.post('/:id/review', authenticate, isUser, addReviewValidation, addReview);

module.exports = router;

