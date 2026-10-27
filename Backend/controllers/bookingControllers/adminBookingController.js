const Booking = require('../../models/Booking');
const { validationResult } = require('express-validator');
const { BOOKING_STATUS, PAYMENT_STATUS } = require('../../utils/constants');
const escapeRegex = require('../../utils/escapeRegex');

/**
 * Get all bookings with filters and search
 */
const getAllBookings = async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      userId,
      vendorId,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    const query = {};

    if (status) query.status = new RegExp(`^${escapeRegex(status)}$`, 'i');
    if (paymentStatus) query.paymentStatus = new RegExp(`^${escapeRegex(paymentStatus)}$`, 'i');
    if (userId) query.userId = userId;
    if (vendorId) query.vendorId = vendorId;

    if (startDate || endDate) {
      query.scheduledDate = {};
      if (startDate) query.scheduledDate.$gte = new Date(startDate);
      if (endDate) query.scheduledDate.$lte = new Date(endDate);
    }

    // Search by booking number or service name
    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { bookingNumber: { $regex: safeSearch, $options: 'i' } },
        { serviceName: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get bookings
    const bookings = await Booking.find(query)
      .select('-workPhotos') // list views never show them; they can be megabytes
      .populate('userId', 'name phone email')
      .populate('vendorId', 'name businessName phone')
      .populate('serviceId', 'title iconUrl')
      .populate('categoryId', 'title slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings. Please try again.'
    });
  }
};

/**
 * Get booking details by ID
 */
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id)
      .populate('userId', 'name phone email addresses')
      .populate('vendorId', 'name businessName phone email address')
      .populate('serviceId', 'title description iconUrl images')
      .populate('categoryId', 'title slug');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking. Please try again.'
    });
  }
};

/**
 * Cancel booking (admin)
 */
const cancelBooking = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { cancellationReason } = req.body;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status === BOOKING_STATUS.CANCELLED) {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    if (booking.status === BOOKING_STATUS.COMPLETED) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed booking'
      });
    }

    // Process refund if booking was paid
    const isPaid = [PAYMENT_STATUS.SUCCESS, 'paid'].includes(booking.paymentStatus);
    const advancePaid = booking.advancePayment?.status === 'paid' ? Number(booking.advancePayment?.paidAmount || 0) : 0;
    const totalToRefund = (isPaid ? Number(booking.finalAmount || 0) : 0) + advancePaid;

    if (totalToRefund > 0) {
      const User = require('../../models/User');
      const Transaction = require('../../models/Transaction');
      await User.findByIdAndUpdate(booking.userId, { $inc: { 'wallet.balance': totalToRefund } }).catch(() => null);
      await Transaction.create({
        userId: booking.userId,
        bookingId: booking._id,
        type: 'refund',
        amount: totalToRefund,
        status: 'completed',
        paymentMethod: 'wallet',
        description: `Admin cancellation refund for booking #${booking.bookingNumber}`
      }).catch(() => null);

      booking.refundedAmount = (booking.refundedAmount || 0) + totalToRefund;
      booking.paymentStatus = PAYMENT_STATUS.REFUNDED;
    }

    // Restore coupon usage if applicable
    if (booking.couponId) {
      try {
        const Coupon = require('../../models/Coupon');
        const CouponRedemption = require('../../models/CouponRedemption');
        await Coupon.findByIdAndUpdate(booking.couponId, { $inc: { usedCount: -1 } });
        await CouponRedemption.deleteOne({ bookingId: booking._id });
      } catch (couponErr) {
        console.warn('[AdminCancelBooking] Failed to restore coupon usage:', couponErr.message);
      }
    }

    // Reset worker availability if assigned
    if (booking.vendorId) {
      const Worker = require('../../models/Worker');
      await Worker.findOneAndUpdate(
        { _id: booking.vendorId, availability: 'ON_JOB' },
        { $set: { availability: 'AVAILABLE' } }
      ).catch(err => console.error('[AdminCancelBooking] Failed to reset worker availability:', err.message));
    }

    // Update booking
    booking.status = BOOKING_STATUS.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancelledBy = 'admin';
    booking.$locals.actor = 'admin';
    booking.cancellationReason = cancellationReason || 'Cancelled by admin';

    await booking.save();

    const { createNotification } = require('../notificationControllers/notificationController');
    if (booking.userId) {
      await createNotification({
        userId: booking.userId,
        type: 'booking_cancelled',
        title: 'Booking Cancelled by Admin',
        message: `Your booking ${booking.bookingNumber} was cancelled by support. Reason: ${cancellationReason || 'Administrative cancellation'}.`,
        relatedId: booking._id,
        relatedType: 'booking'
      }).catch(() => null);
    }
    if (booking.vendorId) {
      await createNotification({
        vendorId: booking.vendorId,
        type: 'booking_cancelled',
        title: 'Booking Cancelled by Admin',
        message: `Booking ${booking.bookingNumber} was cancelled by support.`,
        relatedId: booking._id,
        relatedType: 'booking'
      }).catch(() => null);
    }

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking. Please try again.'
    });
  }
};

/**
 * Get booking analytics
 */
const getBookingAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Total bookings
    const totalBookings = await Booking.countDocuments(dateFilter);

    // Bookings by status
    const bookingsByStatus = await Booking.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Bookings by payment status
    const bookingsByPaymentStatus = await Booking.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$finalAmount' }
        }
      }
    ]);

    // Revenue analytics
    const revenueStats = await Booking.aggregate([
      {
        $match: {
          ...dateFilter,
          paymentStatus: 'success'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$finalAmount' },
          totalBookings: { $sum: 1 },
          averageBookingValue: { $avg: '$finalAmount' }
        }
      }
    ]);

    // Daily bookings trend (last 30 days)
    const dailyTrend = await Booking.aggregate([
      {
        $match: {
          ...dateFilter,
          createdAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$finalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalBookings,
        bookingsByStatus: bookingsByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        bookingsByPaymentStatus: bookingsByPaymentStatus.reduce((acc, item) => {
          acc[item._id] = {
            count: item.count,
            totalAmount: item.totalAmount
          };
          return acc;
        }, {}),
        revenue: revenueStats[0] || {
          totalRevenue: 0,
          totalBookings: 0,
          averageBookingValue: 0
        },
        dailyTrend
      }
    });
  } catch (error) {
    console.error('Get booking analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics. Please try again.'
    });
  }
};

module.exports = {
  getAllBookings,
  getBookingById,
  cancelBooking,
  getBookingAnalytics
};

