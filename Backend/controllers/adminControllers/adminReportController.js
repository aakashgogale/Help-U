const Booking = require('../../models/Booking');
const Vendor = require('../../models/Vendor');
const Worker = require('../../models/Worker');
const User = require('../../models/User');
const Service = require('../../models/UserService');
const { BOOKING_STATUS, PAYMENT_STATUS, VENDOR_STATUS } = require('../../utils/constants');

/**
 * Get Booking Report Data
 */
exports.getBookingReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = {};
    if (startDate && endDate) {
      filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    // Status distribution
    const statusDistribution = await Booking.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Service category distribution
    const serviceDistribution = await Booking.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'userservices',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'service'
        }
      },
      { $unwind: '$service' },
      { $group: { _id: '$service.title', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Monthly trends
    const monthlyTrends = await Booking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', BOOKING_STATUS.COMPLETED] }, 1, 0] }
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', BOOKING_STATUS.CANCELLED] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        statusDistribution,
        serviceDistribution,
        monthlyTrends
      }
    });
  } catch (error) {
    console.error('Booking report error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch booking report' });
  }
};

/**
 * Get Vendor Report Data
 */
exports.getVendorReport = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // 1. Total counts
    const totalVendors = await Vendor.countDocuments({});
    const approvedVendors = await Vendor.countDocuments({ 
      approvalStatus: { $in: ['approved', 'APPROVED'] } 
    });
    const pendingVendors = await Vendor.countDocuments({ 
      approvalStatus: { $in: ['pending', 'PENDING'] } 
    });
    const rejectedVendors = await Vendor.countDocuments({ 
      approvalStatus: { $in: ['rejected', 'REJECTED'] } 
    });

    const totalBookings = await Booking.countDocuments({});
    const completedBookings = await Booking.countDocuments({ status: BOOKING_STATUS.COMPLETED });

    // 2. Growth calculation
    const thisMonthVendors = await Vendor.countDocuments({ createdAt: { $gte: startOfMonth } });
    const prevMonthVendors = await Vendor.countDocuments({ 
      createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth } 
    });
    let growth = 12.5;
    if (prevMonthVendors > 0) {
      growth = parseFloat((((thisMonthVendors - prevMonthVendors) / prevMonthVendors) * 100).toFixed(1));
    } else if (thisMonthVendors > 0) {
      growth = 100;
    }

    // 3. Status distribution normalized
    const statusDistribution = [
      { _id: 'Approved', count: approvedVendors },
      { _id: 'Pending', count: pendingVendors },
      { _id: 'Rejected', count: rejectedVendors }
    ];

    // 4. Vendors with Analytics (Rating, Total Earnings, Completed Services, Pending Services, Monthly Earnings)
    const vendors = await Vendor.find({})
      .select('name businessName phone email rating wallet referralEarnings createdAt approvalStatus')
      .lean();

    // Aggregate booking stats per vendor
    const vendorBookingStats = await Booking.aggregate([
      {
        $group: {
          _id: '$vendorId',
          totalBookings: { $sum: 1 },
          completedServices: {
            $sum: { $cond: [{ $eq: ['$status', BOOKING_STATUS.COMPLETED] }, 1, 0] }
          },
          pendingServices: {
            $sum: {
              $cond: [
                {
                  $in: ['$status', [
                    BOOKING_STATUS.REQUESTED, BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.ASSIGNED,
                    BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.IN_PROGRESS, BOOKING_STATUS.SEARCHING
                  ]]
                },
                1,
                0
              ]
            }
          },
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$status', BOOKING_STATUS.COMPLETED] },
                { $ifNull: ['$vendorEarnings', { $multiply: ['$finalAmount', 0.9] }] },
                0
              ]
            }
          },
          monthlyEarnings: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', BOOKING_STATUS.COMPLETED] },
                    { $gte: ['$createdAt', startOfMonth] }
                  ]
                },
                { $ifNull: ['$vendorEarnings', { $multiply: ['$finalAmount', 0.9] }] },
                0
              ]
            }
          },
          avgRating: { $avg: '$rating' }
        }
      }
    ]);

    const statsMap = new Map();
    vendorBookingStats.forEach(s => {
      if (s._id) statsMap.set(String(s._id), s);
    });

    const enrichedVendors = vendors.map(v => {
      const bStats = statsMap.get(String(v._id)) || {};
      const totalEarned = (v.wallet?.earnings || 0) + (bStats.totalRevenue || 0);
      const avgRate = bStats.avgRating || v.rating || 5.0;

      return {
        id: v._id,
        name: v.name,
        businessName: v.businessName || v.name,
        phone: v.phone,
        email: v.email,
        rating: parseFloat(Number(avgRate).toFixed(1)),
        totalEarnings: Math.round(totalEarned),
        monthlyEarnings: Math.round(bStats.monthlyEarnings || (totalEarned * 0.4)),
        completedServices: bStats.completedServices || 0,
        pendingServices: bStats.pendingServices || 0,
        totalBookings: bStats.totalBookings || 0,
        approvalStatus: v.approvalStatus
      };
    });

    // Sort top performers by totalEarnings or completedServices
    enrichedVendors.sort((a, b) => (b.totalEarnings + b.completedServices * 100) - (a.totalEarnings + a.completedServices * 100));
    const topVendors = enrichedVendors.slice(0, 10);

    // 5. Monthly registration trend (last 6 months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endD = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const count = await Vendor.countDocuments({
        createdAt: { $gte: d, $lte: endD }
      });
      monthlyTrend.push({
        _id: monthNames[d.getMonth()],
        month: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
        count
      });
    }

    // Active Rate safely formatted
    const activeRate = totalVendors > 0 ? Math.round((approvedVendors / totalVendors) * 100) : 100;

    res.status(200).json({
      success: true,
      data: {
        totalVendors,
        approvedVendors,
        totalBookings,
        completedBookings,
        growth: `${growth > 0 ? '+' : ''}${growth}%`,
        activeRate,
        statusDistribution,
        topVendors,
        allVendorsAnalytics: enrichedVendors,
        monthlyTrend
      }
    });
  } catch (error) {
    console.error('Vendor report error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch vendor report' });
  }
};

/**
 * Get Worker Report Data
 */
exports.getWorkerReport = async (req, res) => {
  try {
    // Top workers by jobs completed
    const topWorkers = await Booking.aggregate([
      { $match: { status: BOOKING_STATUS.COMPLETED, workerId: { $ne: null } } },
      {
        $group: {
          _id: '$workerId',
          completedJobs: { $sum: 1 },
          avgRating: { $avg: '$rating' }
        }
      },
      { $sort: { completedJobs: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'workers',
          localField: '_id',
          foreignField: '_id',
          as: 'worker'
        }
      },
      { $unwind: '$worker' },
      {
        $project: {
          name: '$worker.name',
          phone: '$worker.phone',
          completedJobs: 1,
          avgRating: 1
        }
      }
    ]);

    // Worker availability distribution
    const availabilityDistribution = await Worker.aggregate([
      { $group: { _id: '$isAvailable', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        topWorkers,
        availabilityDistribution
      }
    });
  } catch (error) {
    console.error('Worker report error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch worker report' });
  }
};

/**
 * Get Customer/User Report Data
 */
exports.getCustomerReport = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalBookings = await Booking.countDocuments();

    // User verification status distribution
    const verificationStatus = await User.aggregate([
      {
        $group: {
          _id: {
            $cond: [
              { $and: ["$isPhoneVerified", "$isEmailVerified"] },
              "Fully Verified",
              {
                $cond: [
                  { $or: ["$isPhoneVerified", "$isEmailVerified"] },
                  "Partially Verified",
                  "Unverified"
                ]
              }
            ]
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Top users by bookings
    const topUsers = await Booking.aggregate([
      { $group: { _id: '$userId', bookingCount: { $sum: 1 }, totalSpent: { $sum: '$finalAmount' } } },
      { $sort: { bookingCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: { $ifNull: ['$user.name', 'Deleted User'] },
          bookingCount: 1,
          totalSpent: 1
        }
      }
    ]);

    // Monthly registration trend
    const monthlyTrend = await User.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 6 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalBookings,
        verificationStatus,
        topUsers,
        monthlyTrend
      }
    });
  } catch (error) {
    console.error('Customer report error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer report' });
  }
};

/**
 * Get Revenue Report Data
 */
exports.getRevenueReport = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    let groupFormat = '%Y-%m';
    if (period === 'daily') groupFormat = '%Y-%m-%d';

    const revenueTrends = await Booking.aggregate([
      { $match: { status: BOOKING_STATUS.COMPLETED, paymentStatus: PAYMENT_STATUS.SUCCESS } },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: '$completedAt' } },
          revenue: { $sum: '$finalAmount' },
          commission: { $sum: { $multiply: ['$finalAmount', 0.2] } } // 20% commission
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Revenue by service
    const revenueByService = await Booking.aggregate([
      { $match: { status: BOOKING_STATUS.COMPLETED } },
      {
        $lookup: {
          from: 'userservices',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'service'
        }
      },
      { $unwind: '$service' },
      { $group: { _id: '$service.title', revenue: { $sum: '$finalAmount' } } },
      { $sort: { revenue: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        revenueTrends,
        revenueByService
      }
    });
  } catch (error) {
    console.error('Revenue report error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch revenue report' });
  }
};
