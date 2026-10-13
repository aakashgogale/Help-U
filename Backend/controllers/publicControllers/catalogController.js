const Category = require('../../models/Category');
const Brand = require('../../models/Brand');
const Service = require('../../models/UserService');
const { getDisplayPricing } = require('../../utils/servicePricing');
const HomeContent = require('../../models/HomeContent');
const Settings = require('../../models/Settings');

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
    const { cityId } = req.query;

    // Build query
    const query = { status: 'active' };
    if (cityId) {
      query.cityIds = cityId;
    }

    const categories = await Category.find(query)
      .select('title slug homeIconUrl homeBadge hasSaleBadge homeOrder showOnHome')
      .sort({ homeOrder: 1, createdAt: -1 })
      .lean();

    // Fetch only necessary fields for initial category list
    const initialCategories = categories.map(cat => ({
      id: cat._id.toString(),
      title: cat.title,
      slug: cat.slug,
      icon: cat.homeIconUrl || '',
      badge: cat.homeBadge || '',
      hasSaleBadge: cat.hasSaleBadge || false,
      showOnHome: cat.showOnHome || false
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
    const query = { status: 'active' };
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
      const catQuery = { slug: categorySlug, status: 'active' };
      if (cityId) {
        catQuery.cityIds = cityId;
      }

      let category = await Category.findOne(catQuery).lean();

      if (!category && cityId) {
        category = await Category.findOne({ slug: categorySlug, status: 'active' }).lean();
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

    const brand = await Brand.findOne({ slug, status: 'active' })
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
    const brandServices = await Service.find({ brandId: brand._id, status: 'active' }).lean();

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

    const query = { status: 'active' };

    if (brandId) {
      query.brandId = brandId;
    } else if (brandSlug) {
      const brand = await Brand.findOne({ slug: brandSlug });
      if (brand) {
        query.brandId = brand._id;
      } else {
        return res.status(200).json({ success: true, services: [] });
      }
    }

    if (categoryId) {
      query.categoryId = categoryId;
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
      .populate('categoryId', 'title slug cityIds')
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

    // 1. Matched Categories
    const catQuery = { status: 'active' };
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

    // Fetch in parallel
    const [categoriesRes, homeContent, settings] = await Promise.all([
      Category.find({ status: 'active', cityIds: cityId ? cityId : { $exists: true } })
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
        categorySections: (contentObj.categorySections || []).map(section => ({
          title: section.title,
          seeAllTargetCategoryId: section.seeAllTargetCategoryId?.toString() || null,
          cards: (section.cards || []).map(card => ({
            title: card.title,
            imageUrl: card.imageUrl,
            price: card.price,
            rating: card.rating,
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

module.exports = {
  getPublicCategories,
  getPublicBrands,
  getPublicBrandBySlug,
  getPublicServices,
  advancedCatalogSearch,
  getPublicHomeContent,
  getPublicHomeData
};
