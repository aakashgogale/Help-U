const HomeContent = require('../../models/HomeContent');
const Settings = require('../../models/Settings');
const { validationResult } = require('express-validator');

// Single source of truth for the scrap feature.
const isScrapEnabledGlobally = async () => {
  const settings = await Settings.findOne({ type: 'global' }) || await Settings.findOne();
  return settings ? settings.isScrapEnabled !== false : true;
};

/**
 * Get Home Content
 * GET /api/admin/home-content
 */
const getHomeContent = async (req, res) => {
  try {
    const { cityId } = req.query;
    // Use the static method which handles default/creation
    let homeContent = await HomeContent.getHomeContent(cityId);
    const scrapEnabled = await isScrapEnabledGlobally();

    res.status(200).json({
      success: true,
      homeContent: {
        id: homeContent._id,
        cityId: homeContent.cityId,
        banners: homeContent.banners || [],
        promos: homeContent.promos || [],
        curated: homeContent.curated || [],
        noteworthy: homeContent.noteworthy || [],
        booked: homeContent.booked || [],
        categorySections: homeContent.categorySections || [],
        spotlight: homeContent.spotlight || [],
        isActive: homeContent.isActive,
        isBannersVisible: homeContent.isBannersVisible ?? true,
        isPromosVisible: homeContent.isPromosVisible ?? true,
        isCuratedVisible: homeContent.isCuratedVisible ?? true,
        isNoteworthyVisible: homeContent.isNoteworthyVisible ?? true,
        isBookedVisible: homeContent.isBookedVisible ?? true,
        isCategorySectionsVisible: homeContent.isCategorySectionsVisible ?? true,
        isCategoriesVisible: homeContent.isCategoriesVisible ?? true,
        homeCategoryLimit: homeContent.homeCategoryLimit ?? 8,
        showAllServicesTile: homeContent.showAllServicesTile ?? true,
        allServicesLabel: homeContent.allServicesLabel || 'All services',
        isSpotlightVisible: homeContent.isSpotlightVisible ?? true,
        isScrapVisible: scrapEnabled,
        createdAt: homeContent.createdAt,
        updatedAt: homeContent.updatedAt
      }
    });
  } catch (error) {
    console.error('Get home content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch home content. Please try again.'
    });
  }
};

/**
 * Update Home Content
 * PUT /api/admin/home-content
 */
const updateHomeContent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { cityId } = req.query;

    // Use static method to ensure the target doc exists (or is created if needed)
    // *before* we list every doc below, so a brand-new city's doc is included
    // in this save instead of being left with just schema defaults.
    await HomeContent.getHomeContent(cityId);

    // Helper to sanitize array items
    const sanitizeItems = (items) => {
      if (!Array.isArray(items)) return [];
      return items.map(item => {
        const newItem = { ...item };
        // Remove frontend-only 'id' fields that are strings
        // Added 'hsec-' for category sections
        if (typeof newItem.id === 'string' && (
          newItem.id.startsWith('hbnr-') ||
          newItem.id.startsWith('hprm-') ||
          newItem.id.startsWith('hcur-') ||
          newItem.id.startsWith('hnot-') ||
          newItem.id.startsWith('hbkd-') ||
          newItem.id.startsWith('hsec-') ||
          newItem.id.startsWith('hspl-')
        )) {
          delete newItem.id;
        }

        // Handle targetCategoryId/seeAllTargetCategoryId
        if (newItem.targetCategoryId === '') newItem.targetCategoryId = null;
        if (newItem.seeAllTargetCategoryId === '') newItem.seeAllTargetCategoryId = null;
        if (newItem.targetServiceId === '') newItem.targetServiceId = null;
        if (newItem.seeAllTargetServiceId === '') newItem.seeAllTargetServiceId = null;
        if (newItem.zoneId === '' || newItem.zoneId === 'all') newItem.zoneId = null;
        if (Array.isArray(newItem.zones)) {
          newItem.zones = newItem.zones.filter(z => Boolean(z) && String(z) !== 'all');
        }

        // Handle nested cards in categorySections
        if (Array.isArray(newItem.cards)) {
          newItem.cards = newItem.cards.map(card => {
            const newCard = { ...card };
            if (newCard.targetCategoryId === '') newCard.targetCategoryId = null;
            if (newCard.targetServiceId === '') newCard.targetServiceId = null;

            // Remove frontend-only 'id' fields from cards ie. 'hcard-'
            if (typeof newCard.id === 'string' && newCard.id.startsWith('hcard-')) {
              delete newCard.id;
            }

            return newCard;
          });
        }

        return newItem;
      });
    };

    // Home content (banners, promos, etc.) is shared across all cities rather than
    // scoped per-city, so an admin edit/delete is applied to every city's document
    // (plus the default one) and a visitor sees the same result regardless of which
    // city they're browsing from.
    const allHomeContents = await HomeContent.find({});

    for (const doc of allHomeContents) {
      if (req.body.banners !== undefined) doc.banners = sanitizeItems(req.body.banners);
      if (req.body.promos !== undefined) doc.promos = sanitizeItems(req.body.promos);
      if (req.body.curated !== undefined) doc.curated = sanitizeItems(req.body.curated);
      if (req.body.noteworthy !== undefined) doc.noteworthy = sanitizeItems(req.body.noteworthy);
      if (req.body.booked !== undefined) doc.booked = sanitizeItems(req.body.booked);
      if (req.body.spotlight !== undefined) doc.spotlight = sanitizeItems(req.body.spotlight);
      if (req.body.categorySections !== undefined) {
        doc.categorySections = sanitizeItems(req.body.categorySections);
        doc.markModified('categorySections');
      }
      if (req.body.isActive !== undefined) doc.isActive = req.body.isActive;
      if (req.body.isBannersVisible !== undefined) doc.isBannersVisible = req.body.isBannersVisible;
      if (req.body.isPromosVisible !== undefined) doc.isPromosVisible = req.body.isPromosVisible;
      if (req.body.isCuratedVisible !== undefined) doc.isCuratedVisible = req.body.isCuratedVisible;
      if (req.body.isNoteworthyVisible !== undefined) doc.isNoteworthyVisible = req.body.isNoteworthyVisible;
      if (req.body.isBookedVisible !== undefined) doc.isBookedVisible = req.body.isBookedVisible;
      if (req.body.isCategorySectionsVisible !== undefined) doc.isCategorySectionsVisible = req.body.isCategorySectionsVisible;
      if (req.body.isCategoriesVisible !== undefined) doc.isCategoriesVisible = req.body.isCategoriesVisible;
      if (req.body.homeCategoryLimit !== undefined) {
        const limit = Math.round(Number(req.body.homeCategoryLimit));
        if (Number.isFinite(limit)) doc.homeCategoryLimit = Math.min(24, Math.max(1, limit));
      }
      if (req.body.showAllServicesTile !== undefined) doc.showAllServicesTile = !!req.body.showAllServicesTile;
      if (typeof req.body.allServicesLabel === 'string') doc.allServicesLabel = req.body.allServicesLabel.trim().slice(0, 30) || 'All services';
      if (req.body.isSpotlightVisible !== undefined) doc.isSpotlightVisible = req.body.isSpotlightVisible;
      // Scrap visibility is owned exclusively by Settings.isScrapEnabled and is never
      // written from a home-content save. Accepting it here let any unrelated home-page
      // edit push a stale value back and silently re-enable a disabled feature.

      await doc.save();
    }

    const homeContent = allHomeContents.find(doc => String(doc.cityId || '') === String(cityId || '')) || allHomeContents[0];

    const scrapEnabled = await isScrapEnabledGlobally();

    res.status(200).json({
      success: true,
      message: 'Home content updated successfully',
      homeContent: {
        id: homeContent._id,
        cityId: homeContent.cityId,
        banners: homeContent.banners,
        promos: homeContent.promos,
        curated: homeContent.curated,
        noteworthy: homeContent.noteworthy,
        booked: homeContent.booked,
        categorySections: homeContent.categorySections,
        spotlight: homeContent.spotlight,
        isActive: homeContent.isActive,
        isBannersVisible: homeContent.isBannersVisible,
        isPromosVisible: homeContent.isPromosVisible,
        isCuratedVisible: homeContent.isCuratedVisible,
        isNoteworthyVisible: homeContent.isNoteworthyVisible,
        isBookedVisible: homeContent.isBookedVisible,
        isCategorySectionsVisible: homeContent.isCategorySectionsVisible,
        isCategoriesVisible: homeContent.isCategoriesVisible,
        homeCategoryLimit: homeContent.homeCategoryLimit,
        showAllServicesTile: homeContent.showAllServicesTile,
        allServicesLabel: homeContent.allServicesLabel,
        isSpotlightVisible: homeContent.isSpotlightVisible,
        isScrapVisible: scrapEnabled
      }
    });
  } catch (error) {
    console.error('Update home content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update home content. Please try again.'
    });
  }
};

module.exports = {
  getHomeContent,
  updateHomeContent
};

