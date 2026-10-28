const LoginBanner = require('../../models/LoginBanner');
const Settings = require('../../models/Settings');
const { getFlag, invalidateFlagCache } = require('../../utils/featureFlags');
const { DEFAULT_USER_BANNERS, DEFAULT_PARTNER_BANNERS } = require('../publicControllers/loginBannerController');

/**
 * GET /api/admin/login-banners
 * Returns all login banners (active & inactive) for admin management
 * Query params: ?app=user|partner|both
 */
const getAllLoginBanners = async (req, res) => {
  try {
    const { app } = req.query;
    const filter = {};
    if (app && ['user', 'partner', 'both'].includes(app.toLowerCase())) {
      filter.app = app.toLowerCase();
    }

    const banners = await LoginBanner.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      banners
    });
  } catch (error) {
    console.error('Admin get login banners error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch login banners'
    });
  }
};

/**
 * POST /api/admin/login-banners
 * Create a new login banner
 */
const createLoginBanner = async (req, res) => {
  try {
    const {
      app = 'user',
      title,
      subtitle = '',
      badge = '',
      imageUrl = '',
      videoUrl = '',
      mediaType = 'gradient',
      icon = 'sparkles',
      gradient = 'navy',
      offerCode = '',
      linkUrl = '',
      order = 0,
      isActive = true
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Banner title is required'
      });
    }

    const banner = await LoginBanner.create({
      app,
      title: title.trim(),
      subtitle: subtitle.trim(),
      badge: badge.trim(),
      imageUrl: imageUrl.trim(),
      videoUrl: videoUrl.trim(),
      mediaType: mediaType || (videoUrl ? 'video' : imageUrl ? 'image' : 'gradient'),
      icon: icon.trim(),
      gradient: gradient.trim(),
      offerCode: offerCode.trim().toUpperCase(),
      linkUrl: linkUrl.trim(),
      order: Number(order) || 0,
      isActive: Boolean(isActive)
    });

    res.status(201).json({
      success: true,
      message: 'Login banner created successfully',
      banner
    });
  } catch (error) {
    console.error('Create login banner error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create login banner'
    });
  }
};

/**
 * PUT /api/admin/login-banners/:id
 * Update an existing login banner
 */
const updateLoginBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      app,
      title,
      subtitle,
      badge,
      imageUrl,
      videoUrl,
      mediaType,
      icon,
      gradient,
      offerCode,
      linkUrl,
      order,
      isActive
    } = req.body;

    const banner = await LoginBanner.findById(id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    if (app !== undefined) banner.app = app;
    if (title !== undefined) banner.title = title.trim();
    if (subtitle !== undefined) banner.subtitle = subtitle.trim();
    if (badge !== undefined) banner.badge = badge.trim();
    if (imageUrl !== undefined) banner.imageUrl = imageUrl.trim();
    if (videoUrl !== undefined) banner.videoUrl = videoUrl.trim();
    if (mediaType !== undefined) {
      banner.mediaType = mediaType;
    } else if (videoUrl !== undefined) {
      banner.mediaType = videoUrl ? 'video' : (banner.imageUrl ? 'image' : 'gradient');
    }
    if (icon !== undefined) banner.icon = icon.trim();
    if (gradient !== undefined) banner.gradient = gradient.trim();
    if (offerCode !== undefined) banner.offerCode = offerCode.trim().toUpperCase();
    if (linkUrl !== undefined) banner.linkUrl = linkUrl.trim();
    if (order !== undefined) banner.order = Number(order) || 0;
    if (isActive !== undefined) banner.isActive = Boolean(isActive);

    await banner.save();

    res.status(200).json({
      success: true,
      message: 'Login banner updated successfully',
      banner
    });
  } catch (error) {
    console.error('Update login banner error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update login banner'
    });
  }
};

/**
 * DELETE /api/admin/login-banners/:id
 * Delete a login banner
 */
const deleteLoginBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await LoginBanner.findByIdAndDelete(id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Login banner deleted successfully'
    });
  } catch (error) {
    console.error('Delete login banner error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete login banner'
    });
  }
};

/**
 * PATCH /api/admin/login-banners/:id/toggle
 * Toggle active status of a banner
 */
const toggleBannerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await LoginBanner.findById(id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    banner.isActive = !banner.isActive;
    await banner.save();

    res.status(200).json({
      success: true,
      message: `Banner ${banner.isActive ? 'activated' : 'deactivated'} successfully`,
      banner
    });
  } catch (error) {
    console.error('Toggle banner status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle banner status'
    });
  }
};

/**
 * POST /api/admin/login-banners/reorder
 * Reorder banners by providing an array of IDs
 */
const reorderBanners = async (req, res) => {
  try {
    const { bannerIds } = req.body;
    if (!Array.isArray(bannerIds)) {
      return res.status(400).json({
        success: false,
        message: 'bannerIds array is required'
      });
    }

    const bulkOps = bannerIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: index } }
      }
    }));

    if (bulkOps.length > 0) {
      await LoginBanner.bulkWrite(bulkOps);
    }

    const updatedBanners = await LoginBanner.find()
      .sort({ order: 1, createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: 'Banners reordered successfully',
      banners: updatedBanners
    });
  } catch (error) {
    console.error('Reorder banners error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder banners'
    });
  }
};

/**
 * POST /api/admin/login-banners/seed-defaults
 * Seed initial recommended banners for user and partner apps
 */
const seedDefaults = async (req, res) => {
  try {
    const { app = 'all' } = req.body;
    let seededCount = 0;

    const toSeed = [];
    if (app === 'all' || app === 'user') {
      toSeed.push(...DEFAULT_USER_BANNERS.map(({ _id, ...rest }) => rest));
    }
    if (app === 'all' || app === 'partner') {
      toSeed.push(...DEFAULT_PARTNER_BANNERS.map(({ _id, ...rest }) => rest));
    }

    for (const item of toSeed) {
      // Avoid duplicate title for the same app
      const exists = await LoginBanner.findOne({ app: item.app, title: item.title });
      if (!exists) {
        await LoginBanner.create(item);
        seededCount++;
      }
    }

    const banners = await LoginBanner.find()
      .sort({ order: 1, createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: `Seeded ${seededCount} recommended banners`,
      banners
    });
  } catch (error) {
    console.error('Seed defaults error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed default banners'
    });
  }
};

/**
 * GET /api/admin/login-banners/config
 * Returns master enable/disable flags for user and partner login banners
 */
const getLoginBannerConfig = async (req, res) => {
  try {
    const isUserLoginBannersEnabled = await getFlag('isUserLoginBannersEnabled');
    const isPartnerLoginBannersEnabled = await getFlag('isPartnerLoginBannersEnabled');
    res.status(200).json({
      success: true,
      config: {
        isUserLoginBannersEnabled,
        isPartnerLoginBannersEnabled
      }
    });
  } catch (error) {
    console.error('Get login banner config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banner config'
    });
  }
};

/**
 * PUT /api/admin/login-banners/config
 * Update master enable/disable flags
 */
const updateLoginBannerConfig = async (req, res) => {
  try {
    const { isUserLoginBannersEnabled, isPartnerLoginBannersEnabled } = req.body;

    let settings = await Settings.findOne({ type: 'global' });
    if (!settings) {
      settings = new Settings({ type: 'global' });
    }

    if (isUserLoginBannersEnabled !== undefined) {
      settings.isUserLoginBannersEnabled = Boolean(isUserLoginBannersEnabled);
    }
    if (isPartnerLoginBannersEnabled !== undefined) {
      settings.isPartnerLoginBannersEnabled = Boolean(isPartnerLoginBannersEnabled);
    }

    await settings.save();
    invalidateFlagCache();

    res.status(200).json({
      success: true,
      message: 'Login banner master settings updated successfully',
      config: {
        isUserLoginBannersEnabled: settings.isUserLoginBannersEnabled,
        isPartnerLoginBannersEnabled: settings.isPartnerLoginBannersEnabled
      }
    });
  } catch (error) {
    console.error('Update login banner config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update banner config'
    });
  }
};

module.exports = {
  getAllLoginBanners,
  createLoginBanner,
  updateLoginBanner,
  deleteLoginBanner,
  toggleBannerStatus,
  reorderBanners,
  seedDefaults,
  getLoginBannerConfig,
  updateLoginBannerConfig
};

