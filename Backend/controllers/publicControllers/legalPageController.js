const LegalPage = require('../../models/LegalPage');

/**
 * GET /api/public/legal-pages/:slug
 * Public, unauthenticated — used by the user and worker apps.
 * An inactive or not-yet-created page reads as "not found" to the public,
 * even though it exists as a draft in the admin list.
 */
const getPublicLegalPage = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!LegalPage.SLUGS.includes(slug)) {
      return res.status(404).json({ success: false, message: 'Page not found' });
    }

    const page = await LegalPage.findOne({ slug, isActive: true })
      .select('slug title content faqs updatedAt')
      .lean();

    if (!page) {
      return res.status(404).json({ success: false, message: 'This page has not been published yet' });
    }

    res.status(200).json({ success: true, page });
  } catch (error) {
    console.error('Get public legal page error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch page' });
  }
};

module.exports = { getPublicLegalPage };
