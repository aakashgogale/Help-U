const LoginBanner = require('../../models/LoginBanner');
const { getFlag } = require('../../utils/featureFlags');

// Default initial banners if the admin hasn't configured any in the database yet
const DEFAULT_USER_BANNERS = [
  {
    _id: 'default-user-1',
    app: 'user',
    title: 'Flat ₹150 OFF on First Booking',
    subtitle: 'Use code FIRST150 at checkout for instant discount',
    badge: 'WELCOME OFFER',
    icon: 'gift',
    gradient: 'emerald',
    offerCode: 'FIRST150',
    order: 0,
    isActive: true
  },
  {
    _id: 'default-user-2',
    app: 'user',
    title: 'AC Service & Repair Starting @ ₹399',
    subtitle: '30-Day Service Guarantee with 100% verified experts',
    badge: 'TOP RATED',
    icon: 'sparkles',
    gradient: 'navy',
    offerCode: 'AC399',
    order: 1,
    isActive: true
  },
  {
    _id: 'default-user-3',
    app: 'user',
    title: 'Emergency Home Repairs in 30 Mins',
    subtitle: 'Electrician, Plumber & Carpenter at your doorstep',
    badge: 'FASTEST SERVICE',
    icon: 'zap',
    gradient: 'amber',
    offerCode: 'EXPRESS',
    order: 2,
    isActive: true
  }
];

const DEFAULT_PARTNER_BANNERS = [
  {
    _id: 'default-partner-1',
    app: 'partner',
    title: 'Earn up to ₹50,000+ Every Month',
    subtitle: 'Zero joining fee & guaranteed direct weekly payouts',
    badge: 'PARTNER PERKS',
    icon: 'trending',
    gradient: 'navy',
    offerCode: 'JOINNOW',
    order: 0,
    isActive: true
  },
  {
    _id: 'default-partner-2',
    app: 'partner',
    title: '0% Platform Commission for 30 Days',
    subtitle: 'Keep 100% of your earnings on every completed job',
    badge: 'NEW PARTNER BONUS',
    icon: 'gift',
    gradient: 'emerald',
    offerCode: 'ZEROCOMM',
    order: 1,
    isActive: true
  },
  {
    _id: 'default-partner-3',
    app: 'partner',
    title: 'Daily High-Value Service Requests',
    subtitle: 'Work in your preferred areas with flexible hours',
    badge: 'HIGH DEMAND',
    icon: 'zap',
    gradient: 'purple',
    offerCode: 'EXPAND',
    order: 2,
    isActive: true
  }
];

/**
 * GET /api/public/login-banners
 * Public endpoint for User App and Partner App login pages.
 * Query params: ?app=user or ?app=partner
 */
const getPublicLoginBanners = async (req, res) => {
  try {
    const targetApp = (req.query.app || 'user').toLowerCase();
    const flagKey = targetApp === 'partner' ? 'isPartnerLoginBannersEnabled' : 'isUserLoginBannersEnabled';
    const isEnabled = await getFlag(flagKey);

    if (!isEnabled) {
      return res.status(200).json({
        success: true,
        enabled: false,
        banners: [],
        message: 'Floating login banners are disabled by admin'
      });
    }

    const appFilter = targetApp === 'partner' ? ['partner', 'both'] : ['user', 'both'];

    const banners = await LoginBanner.find({
      app: { $in: appFilter },
      isActive: true
    })
      .sort({ order: 1, createdAt: -1 })
      .lean();

    // If no banners in DB yet, serve sensible default banners
    if (!banners || banners.length === 0) {
      const defaults = targetApp === 'partner' ? DEFAULT_PARTNER_BANNERS : DEFAULT_USER_BANNERS;
      return res.status(200).json({
        success: true,
        enabled: true,
        banners: defaults,
        isDefault: true
      });
    }

    res.status(200).json({
      success: true,
      enabled: true,
      banners,
      isDefault: false
    });
  } catch (error) {
    console.error('Get public login banners error:', error);
    // Even if DB error, return fallback banners so UI never breaks on login
    const targetApp = (req.query.app || 'user').toLowerCase();
    const fallback = targetApp === 'partner' ? DEFAULT_PARTNER_BANNERS : DEFAULT_USER_BANNERS;
    res.status(200).json({
      success: true,
      banners: fallback,
      isDefault: true
    });
  }
};

module.exports = {
  getPublicLoginBanners,
  DEFAULT_USER_BANNERS,
  DEFAULT_PARTNER_BANNERS
};

