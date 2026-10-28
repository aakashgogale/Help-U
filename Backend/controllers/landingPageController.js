const LandingPageConfig = require('../models/LandingPageConfig');
const PartnerLead = require('../models/PartnerLead');
const Category = require('../models/Category');
const Settings = require('../models/Settings');
const Worker = require('../models/Worker');
const Review = require('../models/Review');

// A real store listing, not a search page or a placeholder
const PLAY_LISTING_RE = /^https?:\/\/play\.google\.com\/store\/apps\/details\?id=[\w.]+/i;
const APP_STORE_RE = /^https?:\/\/(?:apps|itunes)\.apple\.com\/.+/i;

const formatCount = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k` : String(n));

/** Real numbers counted from the database, so the page never claims more than is true. */
const liveStats = async () => {
  const User = require('../models/User');
  const UserService = require('../models/UserService');

  const [pros, customers, services, rating] = await Promise.all([
    Worker.countDocuments({ approvalStatus: 'approved' }),
    User.countDocuments({}),
    UserService.countDocuments({ status: 'active', publishStatus: { $ne: 'draft' } }),
    Review.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }])
  ]);

  const stats = [
    { label: 'Verified Professionals', value: String(pros), color: 'text-brand' },
    { label: 'Customers', value: String(customers), color: 'text-white' },
    { label: 'Services Available', value: String(services), color: 'text-brand' }
  ];
  if (rating[0] && rating[0].n >= 5) {
    stats.push({ label: `Average Rating (${formatCount(rating[0].n)} reviews)`, value: `${rating[0].avg.toFixed(1)}★`, color: 'text-white' });
  }
  return stats.filter((s) => s.value !== '0');
};

/**
 * Public: Get complete landing page configuration
 * GET /api/public/landing-config
 */
exports.getPublicLandingConfig = async (req, res) => {
  try {
    const config = await LandingPageConfig.getOrCreateConfig();

    // Fetch popular/active top-level categories
    const categories = await Category.find({
      status: 'active',
      publishStatus: { $ne: 'draft' },
      parentId: null
    })
      .select('title name slug icon imageUrl homeIconUrl homeOrder sortOrder')
      .sort({ homeOrder: 1, sortOrder: 1 })
      .limit(16)
      .lean();

    // Optionally get company settings as fallback
    const globalSettings = await Settings.findOne({ type: 'global' }).lean();

    // Only a real store listing is passed on; a search page or placeholder becomes empty and the
    // page then sends visitors to the web app instead
    const rawPlayUrl = (config.appLinks?.playStoreUrl || '').trim();
    const rawAppUrl = (config.appLinks?.appStoreUrl || '').trim();
    const playStoreUrl = PLAY_LISTING_RE.test(rawPlayUrl) ? rawPlayUrl : '';
    const appStoreUrl = APP_STORE_RE.test(rawAppUrl) ? rawAppUrl : '';

    // Real numbers counted from the database unless the admin chose to type their own
    const stats = config.statsMode === 'manual' ? (config.stats || []) : await liveStats();

    const rawPartnerPlayUrl = (config.partnerSection?.partnerPlayStoreUrl || '').trim();
    const rawPartnerAppUrl = (config.partnerSection?.partnerAppStoreUrl || '').trim();
    const partnerPlayStoreUrl = PLAY_LISTING_RE.test(rawPartnerPlayUrl)
      ? rawPartnerPlayUrl
      : (rawPartnerPlayUrl.startsWith('http') ? rawPartnerPlayUrl : '');
    const partnerAppStoreUrl = APP_STORE_RE.test(rawPartnerAppUrl)
      ? rawPartnerAppUrl
      : (rawPartnerAppUrl.startsWith('http') ? rawPartnerAppUrl : '');

    const partnerSectionData = {
      ...(config.partnerSection ? (config.partnerSection.toObject ? config.partnerSection.toObject() : config.partnerSection) : {}),
      partnerPlayStoreUrl,
      partnerAppStoreUrl,
      defaultCity: config.partnerSection?.defaultCity || 'Bangalore',
      trades:
        config.partnerSection?.trades && config.partnerSection.trades.length > 0
          ? config.partnerSection.trades
          : [
              'AC & Appliance Repair',
              'Electrician',
              'Plumbing',
              'Electronics & TV',
              'Cleaning & Pest Control',
              'Carpenter & Painting'
            ]
    };

    res.status(200).json({
      success: true,
      config: {
        hero: config.hero,
        appLinks: {
          ...config.appLinks,
          playStoreUrl,
          appStoreUrl
        },
        aboutUs: config.aboutUs,
        stats,
        statsMode: config.statsMode || 'auto',
        howItWorks: config.howItWorks,
        partnerSection: partnerSectionData,
        faqs: (config.faqs || []).filter(f => f.isActive !== false).sort((a, b) => a.order - b.order),
        // Support phone, email and WhatsApp come only from Admin > Settings > Support, the same
        // numbers the apps use, so the landing page can never show a different set. Nothing is
        // invented when they are empty: the page hides that contact option instead.
        contact: {
          supportEmail: globalSettings?.supportEmail || '',
          supportPhone: globalSettings?.supportPhone || '',
          supportWhatsapp: globalSettings?.supportWhatsapp || '',
          companyAddress: globalSettings?.companyAddress || config.contact?.companyAddress || '',
          workingHours: config.contact?.workingHours || '',
          isContactFormEnabled: config.contact?.isContactFormEnabled !== false
        },
        footer: {
          brandDescription:
            config.footer?.brandDescription ||
            'Enterprise on-demand home & technical services marketplace across Indore. Certified genuine parts, transparent doorstep billing, and background-checked technicians.',
          copyrightText: config.footer?.copyrightText || '© {year} Help-U Technologies. All rights reserved.',
          bottomRightText: config.footer?.bottomRightText || 'Built in Indore 🇮🇳 • Speed, Safety & Quality'
        },
        socialLinks: config.socialLinks,
        testimonials: config.testimonials || [],
        categories: categories.map(c => ({
          id: c._id,
          title: c.title || c.name,
          slug: c.slug,
          icon: c.homeIconUrl || c.imageUrl || c.icon || ''
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching public landing config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve landing page data.'
    });
  }
};

/**
 * Public: Submit partner registration lead
 * POST /api/public/partner-lead
 */
exports.submitPartnerLead = async (req, res) => {
  try {
    const { name, phone, email, trade, city, experience, message } = req.body;

    if (!name || !phone || !trade || !city) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone number, trade, and city are required.'
      });
    }

    // Clean phone number
    const cleanedPhone = String(phone).replace(/\D/g, '').slice(-10);
    if (cleanedPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit mobile number.'
      });
    }

    const lead = await PartnerLead.create({
      name: name.trim(),
      phone: cleanedPhone,
      email: (email || '').trim(),
      trade: trade.trim(),
      city: city.trim(),
      experience: (experience || '1-3 years').trim(),
      message: (message || '').trim()
    });

    res.status(201).json({
      success: true,
      message: 'Registration received! Our onboarding team will contact you shortly.',
      leadId: lead._id
    });
  } catch (error) {
    console.error('Error submitting partner lead:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit registration. Please try again or call our helpline.'
    });
  }
};

/**
 * Admin: Get full landing page configuration
 * GET /api/admin/landing-config
 */
exports.getAdminLandingConfig = async (req, res) => {
  try {
    const config = await LandingPageConfig.getOrCreateConfig();
    res.status(200).json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Error fetching admin landing config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch configuration.'
    });
  }
};

/**
 * Admin: Update landing page configuration
 * PUT /api/admin/landing-config
 */
exports.updateAdminLandingConfig = async (req, res) => {
  try {
    const config = await LandingPageConfig.getOrCreateConfig();
    const updateData = req.body;

    // Allowed sections to update
    const allowedFields = [
      'hero',
      'appLinks',
      'aboutUs',
      'stats',
      'statsMode',
      'howItWorks',
      'partnerSection',
      'faqs',
      'contact',
      'socialLinks',
      'testimonials',
      'footer'
    ];

    if (updateData.appLinks && typeof updateData.appLinks === 'object') {
      if (typeof updateData.appLinks.playStoreUrl === 'string') {
        updateData.appLinks.playStoreUrl = updateData.appLinks.playStoreUrl.trim();
      }
      if (typeof updateData.appLinks.appStoreUrl === 'string') {
        updateData.appLinks.appStoreUrl = updateData.appLinks.appStoreUrl.trim();
      }
    }

    if (updateData.partnerSection && typeof updateData.partnerSection === 'object') {
      if (typeof updateData.partnerSection.partnerPlayStoreUrl === 'string') {
        updateData.partnerSection.partnerPlayStoreUrl = updateData.partnerSection.partnerPlayStoreUrl.trim();
      }
      if (typeof updateData.partnerSection.partnerAppStoreUrl === 'string') {
        updateData.partnerSection.partnerAppStoreUrl = updateData.partnerSection.partnerAppStoreUrl.trim();
      }
      if (typeof updateData.partnerSection.defaultCity === 'string') {
        updateData.partnerSection.defaultCity = updateData.partnerSection.defaultCity.trim();
      }
      if (Array.isArray(updateData.partnerSection.trades)) {
        updateData.partnerSection.trades = updateData.partnerSection.trades
          .map((t) => String(t || '').trim())
          .filter(Boolean);
      }
    }

    if (updateData.footer && typeof updateData.footer === 'object') {
      config.footer = {
        ...(config.footer?.toObject ? config.footer.toObject() : (config.footer || {})),
        ...updateData.footer
      };
      if (typeof updateData.footer.copyrightText === 'string') {
        config.footer.copyrightText = updateData.footer.copyrightText.trim();
      }
      if (typeof updateData.footer.bottomRightText === 'string') {
        config.footer.bottomRightText = updateData.footer.bottomRightText.trim();
      }
      if (typeof updateData.footer.brandDescription === 'string') {
        config.footer.brandDescription = updateData.footer.brandDescription.trim();
      }
      config.markModified('footer');
    }

    allowedFields.forEach((field) => {
      if (field === 'footer') return;
      if (updateData[field] !== undefined) {
        config[field] = updateData[field];
        config.markModified(field);
      }
    });

    await config.save();

    res.status(200).json({
      success: true,
      message: 'Landing page updated successfully!',
      config
    });
  } catch (error) {
    console.error('Error updating landing config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update landing page configuration.'
    });
  }
};

/**
 * Admin: Get partner leads
 * GET /api/admin/partner-leads
 */
exports.getAdminPartnerLeads = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      const s = search.trim();
      query.$or = [
        { name: { $regex: s, $options: 'i' } },
        { phone: { $regex: s, $options: 'i' } },
        { city: { $regex: s, $options: 'i' } },
        { trade: { $regex: s, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [leads, total] = await Promise.all([
      PartnerLead.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      PartnerLead.countDocuments(query)
    ]);

    const statusCounts = await PartnerLead.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const counts = { all: total, new: 0, contacted: 0, onboarded: 0, rejected: 0 };
    statusCounts.forEach(s => {
      if (counts[s._id] !== undefined) counts[s._id] = s.count;
    });

    res.status(200).json({
      success: true,
      leads,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      },
      counts
    });
  } catch (error) {
    console.error('Error getting partner leads:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch partner leads.'
    });
  }
};

/**
 * Admin: Update lead status
 * PUT /api/admin/partner-leads/:id
 */
exports.updatePartnerLeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const lead = await PartnerLead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Partner lead not found.' });
    }

    if (status) {
      lead.status = status;
      if (status === 'contacted' && !lead.contactedAt) {
        lead.contactedAt = new Date();
      }
    }

    if (adminNotes !== undefined) {
      lead.adminNotes = adminNotes;
    }

    await lead.save();

    res.status(200).json({
      success: true,
      message: 'Lead status updated successfully.',
      lead
    });
  } catch (error) {
    console.error('Error updating lead status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update partner lead.'
    });
  }
};

/**
 * Admin: Delete lead
 * DELETE /api/admin/partner-leads/:id
 */
exports.deletePartnerLead = async (req, res) => {
  try {
    const { id } = req.params;
    await PartnerLead.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: 'Partner lead deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting partner lead:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete lead.'
    });
  }
};
