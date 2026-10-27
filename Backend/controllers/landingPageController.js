const LandingPageConfig = require('../models/LandingPageConfig');
const PartnerLead = require('../models/PartnerLead');
const Category = require('../models/Category');
const Settings = require('../models/Settings');

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

    res.status(200).json({
      success: true,
      config: {
        hero: config.hero,
        appLinks: {
          ...config.appLinks,
          playStoreUrl: config.appLinks?.playStoreUrl || 'https://play.google.com/store/search?q=homestr&c=apps'
        },
        aboutUs: config.aboutUs,
        stats: config.stats,
        howItWorks: config.howItWorks,
        partnerSection: config.partnerSection,
        faqs: (config.faqs || []).filter(f => f.isActive !== false).sort((a, b) => a.order - b.order),
        contact: {
          supportEmail: config.contact?.supportEmail || globalSettings?.supportEmail || 'support@homestr.in',
          supportPhone: config.contact?.supportPhone || globalSettings?.supportPhone || '+91 98765 43210',
          supportWhatsapp: config.contact?.supportWhatsapp || globalSettings?.supportWhatsapp || '+91 98765 43210',
          companyAddress: config.contact?.companyAddress || globalSettings?.companyAddress || 'Indore, Madhya Pradesh',
          workingHours: config.contact?.workingHours || 'Monday – Sunday: 8:00 AM – 9:00 PM',
          isContactFormEnabled: config.contact?.isContactFormEnabled !== false
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
 * Public: Submit general contact inquiry
 * POST /api/public/contact-inquiry
 */
exports.submitContactInquiry = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || (!email && !phone) || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, contact info, and message are required.'
      });
    }

    console.log('📬 Landing Page Contact Inquiry received:', { name, email, phone, subject, message });

    res.status(200).json({
      success: true,
      message: 'Thank you! Your message has been sent to our customer care team.'
    });
  } catch (error) {
    console.error('Error submitting contact inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again.'
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
      'howItWorks',
      'partnerSection',
      'faqs',
      'contact',
      'socialLinks',
      'testimonials'
    ];

    allowedFields.forEach((field) => {
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
