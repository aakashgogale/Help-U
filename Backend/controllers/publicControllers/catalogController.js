const Category = require('../../models/Category');
const Brand = require('../../models/Brand');
const Service = require('../../models/UserService');
const Coupon = require('../../models/Coupon');
const { getDisplayPricing } = require('../../utils/servicePricing');
const HomeContent = require('../../models/HomeContent');
const Settings = require('../../models/Settings');
const mongoose = require('mongoose');
const { getRedis, isRedisConnected } = require('../../services/redisService');

/**
 * Public Catalog Controllers
 * These endpoints are accessible without authentication for user app
 */

/**
 * Get all active categories for user app
 * GET /api/public/categories
 */
const getPublicCategories = async (req, res) => {
  try {
    const { cityId, parentId } = req.query;

    // Build query
    const query = { status: 'active', publishStatus: { $ne: 'draft' } };
    if (cityId) {
      query.cityIds = cityId;
    }

    // Default: top-level categories only (parentId: null). Sub-categories
    // never leak into the Home grid or /public/categories listing. Clients
    // explicitly fetch children with ?parentId=<id>; pass ?parentId=all to
    // skip the filter altogether.
    if (parentId === undefined || parentId === null || parentId === '') {
      query.parentId = null;
    } else if (parentId !== 'all') {
      query.parentId = parentId;
    }

    const categories = await Category.find(query)
      .select('title slug homeIconUrl homeBadge hasSaleBadge homeOrder showOnHome parentId subCategoryBadge')
      .sort({ homeOrder: 1, createdAt: -1 })
      .lean();

    // Fetch only necessary fields for initial category list. parentId and
    // subCategoryBadge are additive and ignored by callers that don't need
    // them (the Home grid already uses only id/title/slug/icon/badge).
    const initialCategories = categories.map(cat => ({
      id: cat._id.toString(),
      title: cat.title,
      slug: cat.slug,
      icon: cat.homeIconUrl || '',
      badge: cat.homeBadge || '',
      hasSaleBadge: cat.hasSaleBadge || false,
      showOnHome: cat.showOnHome || false,
      parentId: cat.parentId ? cat.parentId.toString() : null,
      subCategoryBadge: cat.subCategoryBadge || ''
    }));

    res.status(200).json({
      success: true,
      categories: initialCategories
    });
  } catch (error) {
    console.error('Get public categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories. Please try again.'
    });
  }
};

/**
 * Get all active brands for user app (Formerly Services)
 * GET /api/public/brands
 */
const getPublicBrands = async (req, res) => {
  try {
    const { categoryId, categorySlug, search, cityId } = req.query;

    // Build query
    const query = { status: 'active', publishStatus: { $ne: 'draft' } };
    if (categoryId) query.categoryIds = categoryId;
    if (cityId) query.cityIds = cityId;

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.title = { $regex: escapedSearch, $options: 'i' };
    }

    let brands = await Brand.find(query)
      .select('title slug iconUrl logo imageUrl badge categoryIds basePrice discountPrice sections')
      .sort({ createdAt: -1 })
      .lean();

    // If categorySlug is provided, filter by category
    if (categorySlug) {
      const catQuery = { slug: categorySlug, status: 'active', publishStatus: { $ne: 'draft' } };
      if (cityId) {
        catQuery.cityIds = cityId;
      }

      let category = await Category.findOne(catQuery).lean();

      if (!category && cityId) {
        category = await Category.findOne({ slug: categorySlug, status: 'active', publishStatus: { $ne: 'draft' } }).lean();
      }

      if (category) {
        brands = brands.filter(b =>
          Array.isArray(b.categoryIds) &&
          b.categoryIds.some(id => id.toString() === category._id.toString())
        );
      }
    }

    res.status(200).json({
      success: true,
      brands: brands.map(brand => ({
        id: brand._id.toString(),
        title: brand.title,
        slug: brand.slug,
        icon: brand.iconUrl || '',
        logo: brand.logo || brand.iconUrl || '',
        imageUrl: brand.imageUrl || brand.iconUrl || '',
        badge: brand.badge || '',
        price: brand.basePrice || 0, // Legacy support
        originalPrice: brand.discountPrice ? (brand.basePrice + brand.discountPrice) : (brand.basePrice || 0),
        categoryId: brand.categoryIds && brand.categoryIds.length > 0 ? brand.categoryIds[0].toString() : null,
        categoryIds: (brand.categoryIds || []).map(id => id.toString()),
        sections: brand.sections || []
      }))
    });
  } catch (error) {
    console.error('Get public brands error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch brands. Please try again.'
    });
  }
};

/**
 * Get brand by slug for user app
 * GET /api/public/brands/slug/:slug
 */
const getPublicBrandBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const brand = await Brand.findOne({ slug, status: 'active', publishStatus: { $ne: 'draft' } })
      .populate('categoryIds', 'title slug')
      .lean();

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Remove _id from nested objects
    const cleanBrand = JSON.parse(JSON.stringify(brand));
    const removeIds = (obj) => {
      if (Array.isArray(obj)) {
        return obj.map(item => {
          if (item && typeof item === 'object') {
            const { _id, ...rest } = item;
            return removeIds(rest);
          }
          return item;
        });
      } else if (obj && typeof obj === 'object') {
        const { _id, ...rest } = obj;
        return Object.keys(rest).reduce((acc, key) => {
          acc[key] = removeIds(rest[key]);
          return acc;
        }, {});
      }
      return obj;
    };

    // Fetch services associated with this brand
    const brandServices = await Service.find({ brandId: brand._id, status: 'active', publishStatus: { $ne: 'draft' } }).lean();

    // Map services to a default section structure for the frontend
    const servicesSection = {
      title: brand.title,
      subtitle: 'Available Services',
      cards: brandServices.map(svc => ({
        id: svc._id.toString(),
        title: svc.title,
        subtitle: svc.description || '',
        price: svc.basePrice,
        rating: "4.8", // Default rating
        reviews: "1k+", // Default reviews
        imageUrl: svc.iconUrl || brand.iconUrl || '',
        features: svc.description ? [svc.description] : [],
        duration: "60 min", // Default duration
        ...getDisplayPricing(svc)
      }))
    };

    const formattedBrand = {
      id: brand._id.toString(),
      title: brand.title,
      slug: brand.slug,
      icon: brand.iconUrl || '',
      logo: brand.logo || '',
      badge: brand.badge || '',
      basePrice: brand.basePrice, // Legacy
      category: brand.categoryIds && brand.categoryIds[0] ? {
        id: brand.categoryIds[0]._id.toString(),
        title: brand.categoryIds[0].title,
        slug: brand.categoryIds[0].slug
      } : null,
      categories: (brand.categoryIds || []).map(cat => ({
        id: cat._id.toString(),
        title: cat.title,
        slug: cat.slug
      })),
      page: brand.page ? removeIds(brand.page) : {
        banners: brand.iconUrl ? [{ imageUrl: brand.iconUrl, text: brand.title }] : [],
        paymentOffers: [],
        paymentOffersEnabled: false
      },
      sections: brandServices.length > 0 ? [servicesSection] : []
    };

    res.status(200).json({
      success: true,
      brand: formattedBrand
    });
  } catch (error) {
    console.error('Get public brand by slug error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch brand. Please try again.'
    });
  }
};

/**
 * Get services based on brand
 * GET /api/public/services
 */
const getPublicServices = async (req, res) => {
  try {
    const { brandId, brandSlug, categoryId, search, q, sortBy, minPrice, maxPrice, cityId } = req.query;

    const query = { status: 'active', publishStatus: { $ne: 'draft' } };

    if (brandId) {
      query.brandId = brandId;
    } else if (brandSlug) {
      const brand = await Brand.findOne({ slug: brandSlug, status: 'active', publishStatus: { $ne: 'draft' } });
      if (brand) {
        query.brandId = brand._id;
      } else {
        return res.status(200).json({ success: true, services: [] });
      }
    }

    if (categoryId) {
      if (mongoose.Types.ObjectId.isValid(categoryId)) {
        const catObjId = new mongoose.Types.ObjectId(categoryId);
        const childCategories = await Category.find({ parentId: catObjId, status: 'active' }).select('_id').lean();
        const catIds = [catObjId, ...childCategories.map(c => c._id)];
        query.categoryId = { $in: catIds };
      } else {
        query.categoryId = categoryId;
      }
    }

    if (minPrice || maxPrice) {
      query.basePrice = {};
      if (minPrice) query.basePrice.$gte = Number(minPrice);
      if (maxPrice) query.basePrice.$lte = Number(maxPrice);
    }

    const searchQuery = (search || q || '').trim();
    if (searchQuery) {
      const escapedSearch = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const terms = escapedSearch.split(/\s+/).filter(Boolean);
      query.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } },
        ...terms.map(t => ({ title: { $regex: t, $options: 'i' } }))
      ];
    }

    let services = await Service.find(query)
      .populate('brandId', 'title iconUrl cityIds')
      .populate('categoryId', 'title slug cityIds parentId')
      .lean();

    // City filtering if cityId provided
    if (cityId) {
      services = services.filter(svc => {
        const catCities = svc.categoryId?.cityIds || [];
        const brandCities = svc.brandId?.cityIds || [];
        if (catCities.length === 0 && brandCities.length === 0) return true;
        return catCities.some(c => String(c) === String(cityId)) ||
               brandCities.some(c => String(c) === String(cityId));
      });
    }

    // Multi-factor relevance calculation
    const queryLower = searchQuery.toLowerCase();
    const rankedServices = services.map(svc => {
      const titleLower = (svc.title || '').toLowerCase();
      const descLower = (svc.description || '').toLowerCase();
      let relevance = 0;

      if (queryLower) {
        if (titleLower === queryLower) relevance += 100;
        else if (titleLower.startsWith(queryLower)) relevance += 60;
        else if (titleLower.includes(queryLower)) relevance += 35;
        else {
          const words = queryLower.split(' ');
          words.forEach(w => {
            if (titleLower.includes(w)) relevance += 15;
            if (descLower.includes(w)) relevance += 5;
          });
        }
      }

      const rating = Number(svc.rating || 4.8);
      const reviewsCount = Number(svc.reviewsCount || 60);

      // Blended multi-factor score (relevance, rating, popularity)
      const multiFactorScore = Math.round(
        (relevance * 0.5) +
        (rating * 10 * 0.3) +
        (Math.min(reviewsCount, 200) / 200 * 20 * 0.2)
      );

      return {
        ...svc,
        _relevance: relevance,
        _score: multiFactorScore,
        rating,
        reviewsCount
      };
    });

    // Dynamic sorting
    if (sortBy === 'price_asc') {
      rankedServices.sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0));
    } else if (sortBy === 'price_desc') {
      rankedServices.sort((a, b) => (b.basePrice || 0) - (a.basePrice || 0));
    } else if (sortBy === 'rating_desc') {
      rankedServices.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'popular') {
      rankedServices.sort((a, b) => (b.reviewsCount || 0) - (a.reviewsCount || 0));
    } else if (searchQuery) {
      rankedServices.sort((a, b) => b._score - a._score);
    } else {
      rankedServices.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    res.status(200).json({
      success: true,
      services: rankedServices.map(svc => ({
        id: svc._id.toString(),
        title: svc.title,
        slug: svc.slug,
        icon: svc.iconUrl,
        basePrice: svc.basePrice,
        gstPercentage: svc.gstPercentage,
        description: svc.description,
        brandId: svc.brandId?._id,
        brandName: svc.brandId?.title,
        brandIcon: svc.brandId?.iconUrl,
        categoryId: svc.categoryId?._id,
        categoryName: svc.categoryId?.title,
        parentCategoryId: svc.categoryId?.parentId ? svc.categoryId.parentId.toString() : null,
        durationMinutes: svc.durationMinutes,
        variants: svc.variants || [],
        rating: svc.rating,
        reviewsCount: svc.reviewsCount,
        score: svc._score,
        ...getDisplayPricing(svc)
      }))
    });
  } catch (error) {
    console.error('Get public services error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services'
    });
  }
};

/**
 * Advanced Multi-Factor Marketplace Search (Categories & Services)
 * GET /api/public/search/advanced
 */
const advancedCatalogSearch = async (req, res) => {
  try {
    const { q, search, cityId, categoryId, sortBy } = req.query;
    const queryTerm = (q || search || '').trim().toLowerCase();

    if (!queryTerm) {
      return res.status(200).json({
        success: true,
        categories: [],
        services: []
      });
    }

    // 1. Matched Categories (top-level only — sub-categories are discovery
    // surfaces inside a parent catalog, not standalone search results).
    const catQuery = { status: 'active', parentId: null, publishStatus: { $ne: 'draft' } };
    if (cityId) catQuery.cityIds = cityId;
    catQuery.$or = [
      { title: { $regex: queryTerm, $options: 'i' } },
      { slug: { $regex: queryTerm, $options: 'i' } }
    ];

    const categories = await Category.find(catQuery)
      .select('title slug homeIconUrl homeBadge')
      .limit(6)
      .lean();

    // 2. Delegate to getPublicServices logic for ranked services
    req.query.search = queryTerm;
    // Query services with multi-factor
    const serviceQuery = {
      status: 'active',
      publishStatus: { $ne: 'draft' },
      $or: [
        { title: { $regex: queryTerm, $options: 'i' } },
        { description: { $regex: queryTerm, $options: 'i' } }
      ]
    };
    if (categoryId) serviceQuery.categoryId = categoryId;

    let services = await Service.find(serviceQuery)
      .populate('brandId', 'title iconUrl cityIds')
      .populate('categoryId', 'title slug cityIds')
      .lean();

    if (cityId) {
      services = services.filter(svc => {
        const catCities = svc.categoryId?.cityIds || [];
        const brandCities = svc.brandId?.cityIds || [];
        if (catCities.length === 0 && brandCities.length === 0) return true;
        return catCities.some(c => String(c) === String(cityId)) ||
               brandCities.some(c => String(c) === String(cityId));
      });
    }

    const ranked = services.map(svc => {
      const titleLower = (svc.title || '').toLowerCase();
      let rel = 0;
      if (titleLower === queryTerm) rel += 100;
      else if (titleLower.startsWith(queryTerm)) rel += 60;
      else if (titleLower.includes(queryTerm)) rel += 30;
      else rel += 10;

      const rating = Number(svc.rating || 4.8);
      const score = Math.round(rel * 0.6 + rating * 8);

      return {
        id: svc._id.toString(),
        title: svc.title,
        slug: svc.slug,
        icon: svc.iconUrl,
        basePrice: svc.basePrice,
        rating,
        reviewsCount: svc.reviewsCount || 50,
        brandId: svc.brandId?._id,
        brandName: svc.brandId?.title,
        categoryId: svc.categoryId?._id,
        categoryName: svc.categoryId?.title,
        score,
        ...getDisplayPricing(svc)
      };
    }).sort((a, b) => b.score - a.score);

    res.status(200).json({
      success: true,
      categories: categories.map(c => ({
        id: c._id.toString(),
        title: c.title,
        slug: c.slug,
        icon: c.homeIconUrl || '',
        badge: c.homeBadge || '',
        isCategory: true
      })),
      services: ranked.slice(0, 15)
    });
  } catch (error) {
    console.error('Advanced catalog search error:', error);
    res.status(500).json({ success: false, message: 'Advanced search failed' });
  }
};

/**
 * Get home content
 */
const getPublicHomeContent = async (req, res) => {
  try {
    const { cityId } = req.query;
    const homeContent = await HomeContent.getHomeContent(cityId);

    if (!homeContent) {
      return res.status(200).json({
        success: true,
        homeContent: {
          banners: [],
          promos: [],
          curated: [],
          noteworthy: [],
          booked: [],
          categorySections: []
        }
      });
    }

    const [contentObjDoc, settings] = await Promise.all([
      homeContent,
      Settings.findOne({ type: 'global' }).lean().catch(() => null)
    ]);

    const contentObj = contentObjDoc.toObject();
    const isGlobalScrapEnabled = settings ? settings.isScrapEnabled !== false : true;

    const formattedContent = {
      banners: (contentObj.banners || []).map(item => ({
        ...item,
        id: item._id ? item._id.toString() : item.id,
        targetCategoryId: item.targetCategoryId?.toString() || null,
        targetServiceId: item.targetServiceId?.toString() || null,
      })),
      promos: (contentObj.promos || []).map(item => ({
        ...item,
        id: item._id ? item._id.toString() : item.id,
        targetCategoryId: item.targetCategoryId?.toString() || null,
        targetServiceId: item.targetServiceId?.toString() || null,
      })),
      curated: (contentObj.curated || []).map(item => ({
        ...item,
        id: item._id ? item._id.toString() : item.id,
        targetCategoryId: item.targetCategoryId?.toString() || null,
        targetServiceId: item.targetServiceId?.toString() || null,
      })),
      noteworthy: (contentObj.noteworthy || []).map(item => ({
        ...item,
        id: item._id ? item._id.toString() : item.id,
        targetCategoryId: item.targetCategoryId?.toString() || null,
        targetServiceId: item.targetServiceId?.toString() || null,
      })),
      booked: (contentObj.booked || []).map(item => ({
        ...item,
        id: item._id ? item._id.toString() : item.id,
        targetCategoryId: item.targetCategoryId?.toString() || null,
        targetServiceId: item.targetServiceId?.toString() || null,
      })),
      spotlight: (contentObj.spotlight || []).map(item => ({
        ...item,
        id: item._id ? item._id.toString() : item.id,
        targetCategoryId: item.targetCategoryId?.toString() || null,
        targetServiceId: item.targetServiceId?.toString() || null,
      })),
      categorySections: (contentObj.categorySections || []).map(section => ({
        ...section,
        id: section._id ? section._id.toString() : section.id,
        seeAllTargetCategoryId: section.seeAllTargetCategoryId?.toString() || null,
        seeAllTargetServiceId: section.seeAllTargetServiceId?.toString() || null,
        cards: (section.cards || []).map(card => ({
          ...card,
          id: card._id ? card._id.toString() : card.id,
          targetCategoryId: card.targetCategoryId?.toString() || null,
          targetServiceId: card.targetServiceId?.toString() || null,
        }))
      })),
      isBannersVisible: contentObj.isBannersVisible ?? true,
      isPromosVisible: contentObj.isPromosVisible ?? true,
      isCuratedVisible: contentObj.isCuratedVisible ?? true,
      isNoteworthyVisible: contentObj.isNoteworthyVisible ?? true,
      isBookedVisible: contentObj.isBookedVisible ?? true,
      isCategorySectionsVisible: contentObj.isCategorySectionsVisible ?? true,
      isCategoriesVisible: contentObj.isCategoriesVisible ?? true,
      isSpotlightVisible: contentObj.isSpotlightVisible ?? true,
      isScrapVisible: isGlobalScrapEnabled
    };

    res.status(200).json({
      success: true,
      homeContent: formattedContent,
      isScrapEnabled: isGlobalScrapEnabled
    });

  } catch (error) {
    console.error('Get public home content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch home content. Please try again.'
    });
  }
};

/**
 * Get consolidated home data (Categories + Content)
 */
const getPublicHomeData = async (req, res) => {
  try {
    const { cityId } = req.query;

    // Fetch in parallel. Categories filter is top-level only (parentId: null)
    // so sub-categories can never leak into the Home grid; the Home UI
    // consumes this payload unchanged.
    const [categoriesRes, homeContent, settings] = await Promise.all([
      Category.find({ status: 'active', parentId: null, publishStatus: { $ne: 'draft' }, cityIds: cityId ? cityId : { $exists: true } })
        .select('title slug homeIconUrl homeBadge hasSaleBadge')
        .sort({ homeOrder: 1 })
        .lean(),
      HomeContent.getHomeContent(cityId),
      Settings.findOne({ type: 'global' }).lean().catch(() => null)
    ]);

    const isGlobalScrapEnabled = settings ? settings.isScrapEnabled !== false : true;

    const formattedCategories = categoriesRes.map(cat => ({
      id: cat._id.toString(),
      title: cat.title,
      slug: cat.slug,
      icon: cat.homeIconUrl || '',
      badge: cat.homeBadge || '',
      hasSaleBadge: cat.hasSaleBadge || false
    }));

    let formattedContent = null;
    if (homeContent) {
      const contentObj = homeContent.toObject();
      formattedContent = {
        banners: (contentObj.banners || []).map(item => ({
          imageUrl: item.imageUrl,
          targetCategoryId: item.targetCategoryId?.toString() || null,
          slug: item.slug,
          order: item.order
        })),
        promos: (contentObj.promos || []).map(item => ({
          title: item.title,
          subtitle: item.subtitle,
          imageUrl: item.imageUrl,
          targetCategoryId: item.targetCategoryId?.toString() || null,
          order: item.order
        })),
        curated: (contentObj.curated || []).map(item => ({
          title: item.title,
          gifUrl: item.gifUrl,
          order: item.order
        })),
        noteworthy: (contentObj.noteworthy || []).map(item => ({
          title: item.title,
          imageUrl: item.imageUrl,
          targetCategoryId: item.targetCategoryId?.toString() || null,
          order: item.order
        })),
        booked: (contentObj.booked || []).map(item => ({
          title: item.title,
          rating: item.rating,
          price: item.price,
          imageUrl: item.imageUrl,
          targetCategoryId: item.targetCategoryId?.toString() || null,
          order: item.order
        })),
        spotlight: (contentObj.spotlight || []).map(item => ({
          id: item._id ? item._id.toString() : item.id,
          badge: item.badge,
          title: item.title,
          subtitle: item.subtitle,
          startingPrice: item.startingPrice,
          buttonText: item.buttonText,
          imageUrl: item.imageUrl,
          backgroundColor: item.backgroundColor,
          textColor: item.textColor,
          badgeColor: item.badgeColor,
          targetCategoryId: item.targetCategoryId?.toString() || null,
          targetServiceId: item.targetServiceId?.toString() || null,
          slug: item.slug,
          order: item.order
        })),
        categorySections: (contentObj.categorySections || []).map(section => ({
          title: section.title,
          seeAllTargetCategoryId: section.seeAllTargetCategoryId?.toString() || null,
          cards: (section.cards || []).map(card => ({
            title: card.title,
            imageUrl: card.imageUrl,
            price: card.price,
            rating: card.rating,
            optionsCount: card.optionsCount,
            targetCategoryId: card.targetCategoryId?.toString() || null
          })),
          order: section.order
        })),
        isBannersVisible: contentObj.isBannersVisible ?? true,
        isPromosVisible: contentObj.isPromosVisible ?? true,
        isCuratedVisible: contentObj.isCuratedVisible ?? true,
        isNoteworthyVisible: contentObj.isNoteworthyVisible ?? true,
        isBookedVisible: contentObj.isBookedVisible ?? true,
        isCategorySectionsVisible: contentObj.isCategorySectionsVisible ?? true,
        isCategoriesVisible: contentObj.isCategoriesVisible ?? true,
        isSpotlightVisible: contentObj.isSpotlightVisible ?? true,
        isScrapVisible: isGlobalScrapEnabled
      };
    }

    res.status(200).json({
      success: true,
      categories: formattedCategories,
      homeContent: formattedContent,
      isScrapEnabled: isGlobalScrapEnabled
    });
  } catch (error) {
    console.error('Get public home data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch home data'
    });
  }
};

/**
 * Per-category arrival-time estimate for the user's current location
 * GET /api/public/categories/eta?lat=&lng=&cityId=
 *
 * Returns { categoryId: minutes } for every category where at least one
 * APPROVED + online + available worker who offers that category exists
 * within the service radius. Minutes = ceil(distance_km / avg_speed * 60)
 * clamped to a sensible display range. Categories with no match are omitted
 * so the UI hides the badge.
 */
const getCategoriesEta = async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const { cityId } = req.query;

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(200).json({ success: true, eta: {} });
    }

    const Worker = require('../../models/Worker');
    const { WORKER_STATUS } = require('../../utils/constants');

    const categoryQuery = { status: 'active', publishStatus: { $ne: 'draft' } };
    if (cityId) categoryQuery.cityIds = cityId;
    // Top-level only — sub-categories inherit their parent's ETA badge
    // through the catalog modal; they don't own their own badge on the grid.
    categoryQuery.parentId = null;
    const categories = await Category.find(categoryQuery)
      .select('title slug')
      .lean();

    if (categories.length === 0) {
      return res.status(200).json({ success: true, eta: {} });
    }

    // Pull the global search radius once so admins can tune it
    const globalSettings = await Settings.findOne({ type: 'global' }).select('searchRadius').lean();
    const radiusKm = globalSettings?.searchRadius || 15;
    const radiusMeters = radiusKm * 1000;

    // Nearby online + available workers with real coordinates. Keep select tiny.
    const nearby = await Worker.find({
      approvalStatus: WORKER_STATUS.APPROVED,
      isActive: true,
      isOnline: true,
      availability: 'AVAILABLE',
      'geoLocation.coordinates': { $ne: [0, 0] },
      geoLocation: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusMeters
        }
      }
    })
      .select('service categories geoLocation')
      .limit(200)
      .lean();

    if (nearby.length === 0) {
      return res.status(200).json({ success: true, eta: {} });
    }

    // Precompute each worker's distance from the user (km). $near already
    // ordered them by distance, so the first match for a category is the closest.
    const workerDistanceKm = nearby.map(w => {
      const [wLng, wLat] = w.geoLocation?.coordinates || [0, 0];
      const dLat = (wLat - lat) * Math.PI / 180;
      const dLng = (wLng - lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat * Math.PI / 180) * Math.cos(wLat * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
      return 2 * 6371 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    });

    // Average urban travel speed used to convert distance -> minutes. Includes
    // the few minutes a worker needs to acknowledge the job and set off.
    const AVG_SPEED_KMPH = 25;
    const BASE_MINUTES = 10;
    const MIN_DISPLAY = 20;
    const MAX_DISPLAY = 120;

    const eta = {};
    for (const cat of categories) {
      const haystack = [cat.title, cat.slug].filter(Boolean).map(s => s.toLowerCase());

      // Find the closest nearby worker whose declared services/categories match
      // this category by title or slug (case-insensitive, substring match either way).
      for (let i = 0; i < nearby.length; i++) {
        const w = nearby[i];
        const workerTags = [...(w.service || []), ...(w.categories || [])]
          .map(s => (s || '').toLowerCase())
          .filter(Boolean);

        const matches = workerTags.some(tag =>
          haystack.some(h => tag === h || tag.includes(h) || h.includes(tag))
        );

        if (matches) {
          const km = workerDistanceKm[i];
          const minutes = Math.ceil(BASE_MINUTES + (km / AVG_SPEED_KMPH) * 60);
          const clamped = Math.min(MAX_DISPLAY, Math.max(MIN_DISPLAY, minutes));
          eta[cat._id.toString()] = clamped;
          break;
        }
      }
    }

    return res.status(200).json({ success: true, eta });
  } catch (error) {
    console.error('Get categories ETA error:', error);
    // Soft-fail so the home grid still renders without badges
    return res.status(200).json({ success: true, eta: {} });
  }
};

/**
 * GET /api/public/categories/:idOrSlug/catalog
 * Consolidated category catalog payload:
 * - Category hero ({ tag, title, startingPrice, imageUrl })
 * - Best coupon (category-specific first, then app-wide; filtered by isActive, in-date, isAutoApply prioritised, highest discountValue)
 * - SubCategories[] (active children of this category)
 * - Sections[] (ordered by Brand.displayOrder) with nested services[] (active + publishStatus=published only, filtered to this brand+category, ordered by UserService.sortOrder) and each service's variants[] (active only, ordered by variant.order)
 * Short Redis cache (public:catalog:<idOrSlug>:<cityId|'all'>, TTL 120s).
 */
const getPublicCategoryCatalog = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const { cityId } = req.query;

    if (!idOrSlug) {
      return res.status(400).json({ success: false, message: 'Category ID or slug is required.' });
    }

    const cacheKey = `public:catalog:${idOrSlug}:${cityId || 'all'}`;
    const redis = getRedis();

    // 1. Short Redis cache check
    if (isRedisConnected() && redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return res.status(200).json(JSON.parse(cached));
        }
      } catch (cacheErr) {
        // Non-blocking cache read error
      }
    }

    // 2. Resolve Category (by ObjectId or slug)
    const isObjectId = mongoose.Types.ObjectId.isValid(idOrSlug) && /^[0-9a-fA-F]{24}$/.test(idOrSlug);
    const categoryQuery = {
      status: 'active',
      publishStatus: { $ne: 'draft' },
      ...(isObjectId ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug }] } : { slug: idOrSlug })
    };

    const category = await Category.findOne(categoryQuery).lean();
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.'
      });
    }

    // 3. Category hero
    const hero = {
      tag: category.heroBanner?.tag || '',
      title: category.heroBanner?.title || '',
      startingPrice: category.heroBanner?.startingPrice || '',
      imageUrl: category.heroBanner?.imageUrl || ''
    };

    // 4. SubCategories (active children of this category)
    const subCategoriesQuery = {
      parentId: category._id,
      status: 'active',
      publishStatus: { $ne: 'draft' }
    };
    if (cityId) {
      subCategoriesQuery.$or = [
        { cityIds: cityId },
        { cityIds: { $size: 0 } },
        { cityIds: { $exists: false } }
      ];
    }

    const subCategoriesDocs = await Category.find(subCategoriesQuery)
      .select('title slug homeIconUrl homeBadge subCategoryBadge sortOrder homeOrder heroBanner')
      .sort({ sortOrder: 1, homeOrder: 1, createdAt: 1 })
      .lean();

    const subCategories = subCategoriesDocs.map(sc => ({
      _id: sc._id,
      id: sc._id.toString(),
      title: sc.title,
      slug: sc.slug,
      icon: sc.homeIconUrl || '',
      homeIconUrl: sc.homeIconUrl || '',
      badge: sc.subCategoryBadge || sc.homeBadge || '',
      subCategoryBadge: sc.subCategoryBadge || '',
      sortOrder: sc.sortOrder || 0,
      parentId: category._id.toString()
    }));

    // 5. Best Coupon: category-specific first, then app-wide; filter by isActive, in-date, isAutoApply prioritised, pick highest discountValue
    const now = new Date();
    const couponQuery = {
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
      $or: [
        { categories: category._id },
        { categories: { $size: 0 } },
        { categories: { $exists: false } }
      ]
    };
    if (cityId) {
      couponQuery.$and = [
        {
          $or: [
            { cities: cityId },
            { cities: { $size: 0 } },
            { cities: { $exists: false } }
          ]
        }
      ];
    }

    const rawCoupons = await Coupon.find(couponQuery).lean();
    const validCoupons = rawCoupons.filter(c => {
      if (c.usageLimit && c.usageLimit > 0 && (c.usedCount || 0) >= c.usageLimit) {
        return false;
      }
      return true;
    });

    validCoupons.sort((a, b) => {
      const aCatSpecific = Array.isArray(a.categories) && a.categories.some(id => id.toString() === category._id.toString()) ? 1 : 0;
      const bCatSpecific = Array.isArray(b.categories) && b.categories.some(id => id.toString() === category._id.toString()) ? 1 : 0;
      if (aCatSpecific !== bCatSpecific) {
        return bCatSpecific - aCatSpecific; // Category-specific first
      }

      const aAuto = a.isAutoApply ? 1 : 0;
      const bAuto = b.isAutoApply ? 1 : 0;
      if (aAuto !== bAuto) {
        return bAuto - aAuto; // isAutoApply prioritised
      }

      const aVal = a.discountValue || 0;
      const bVal = b.discountValue || 0;
      return bVal - aVal; // Highest discountValue
    });

    const topCoupon = validCoupons[0] || null;
    const bestCoupon = topCoupon ? {
      _id: topCoupon._id,
      code: topCoupon.code,
      title: topCoupon.title,
      description: topCoupon.description || '',
      discountType: topCoupon.discountType,
      discountValue: topCoupon.discountValue,
      maxDiscountAmount: topCoupon.maxDiscountAmount || 0,
      minOrderAmount: topCoupon.minOrderAmount || 0,
      isAutoApply: !!topCoupon.isAutoApply,
      validUntil: topCoupon.validUntil
    } : null;

    // 6. Sections with nested services and variants via aggregation ($lookup, no N+1)
    const brandMatch = {
      status: 'active',
      publishStatus: { $ne: 'draft' },
      $or: [
        { categoryIds: category._id },
        { categoryId: category._id }
      ]
    };
    if (cityId) {
      brandMatch.$and = [
        {
          $or: [
            { cityIds: new mongoose.Types.ObjectId(cityId) },
            { cityIds: { $size: 0 } },
            { cityIds: { $exists: false } }
          ]
        }
      ];
    }

    const allowedCategoryIds = [category._id, ...subCategoriesDocs.map(sc => sc._id)];

    const sectionsPipeline = [
      { $match: brandMatch },
      { $sort: { displayOrder: 1, createdAt: 1 } },
      {
        $lookup: {
          from: 'userservices',
          let: { brandId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$brandId', '$$brandId'] },
                    { $eq: ['$status', 'active'] },
                    { $ne: ['$publishStatus', 'draft'] },
                    {
                      $or: [
                        { $in: ['$categoryId', allowedCategoryIds] },
                        { $eq: [{ $ifNull: ['$categoryId', null] }, null] }
                      ]
                    }
                  ]
                }
              }
            },
            ...(cityId ? [{
              $match: {
                $or: [
                  { cityIds: new mongoose.Types.ObjectId(cityId) },
                  { cityIds: { $size: 0 } },
                  { cityIds: { $exists: false } }
                ]
              }
            }] : []),
            { $sort: { sortOrder: 1, createdAt: 1 } },
            {
              $addFields: {
                variants: {
                  $sortArray: {
                    input: {
                      $filter: {
                        input: { $ifNull: ['$variants', []] },
                        as: 'v',
                        cond: { $eq: ['$$v.isActive', true] }
                      }
                    },
                    sortBy: { order: 1 }
                  }
                }
              }
            }
          ],
          as: 'services'
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          slug: 1,
          iconUrl: 1,
          badge: 1,
          displayOrder: 1,
          bannerPromo: 1,
          services: 1
        }
      }
    ];

    const sections = await Brand.aggregate(sectionsPipeline);

    const payload = {
      success: true,
      category: {
        _id: category._id,
        id: category._id.toString(),
        title: category.title,
        slug: category.slug,
        displayRating: category.displayRating || '',
        bookingsLabel: category.bookingsLabel || '',
        etaDefaultMinutes: category.etaDefaultMinutes || null,
        hasBrands: !!category.hasBrands,
        hero
      },
      hero,
      bestCoupon,
      subCategories,
      sections
    };

    // Cache in Redis for 120s
    if (isRedisConnected() && redis) {
      try {
        await redis.setex(cacheKey, 120, JSON.stringify(payload));
      } catch (err) {
        // Non-blocking cache write error
      }
    }

    return res.status(200).json(payload);
  } catch (error) {
    console.error('Get public category catalog error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch catalog. Please try again.'
    });
  }
};

module.exports = {
  getPublicCategories,
  getPublicBrands,
  getPublicBrandBySlug,
  getPublicServices,
  advancedCatalogSearch,
  getPublicHomeContent,
  getPublicHomeData,
  getCategoriesEta,
  getPublicCategoryCatalog
};

