const LegalPage = require('../../models/LegalPage');

const DEFAULT_TITLES = {
  'terms-and-conditions': 'Terms & Conditions',
  'privacy-policy': 'Privacy Policy',
  faq: 'Frequently Asked Questions'
};

/**
 * GET /api/admin/legal-pages
 * Every slug is always returned, creating a blank draft document for any
 * slug the admin has not touched yet, so the admin UI always has three rows.
 */
const getAllLegalPages = async (req, res) => {
  try {
    const existing = await LegalPage.find().lean();
    const bySlug = new Map(existing.map((p) => [p.slug, p]));

    const pages = LegalPage.SLUGS.map((slug) => bySlug.get(slug) || {
      slug,
      title: DEFAULT_TITLES[slug],
      content: '',
      faqs: [],
      isActive: false,
      isDraft: true
    });

    res.status(200).json({ success: true, pages });
  } catch (error) {
    console.error('Get legal pages error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch legal pages' });
  }
};

/**
 * GET /api/admin/legal-pages/:slug
 */
const getLegalPage = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!LegalPage.SLUGS.includes(slug)) {
      return res.status(404).json({ success: false, message: 'Unknown page' });
    }

    const page = await LegalPage.findOne({ slug }).populate('lastUpdatedBy', 'name email').lean();
    res.status(200).json({
      success: true,
      page: page || { slug, title: DEFAULT_TITLES[slug], content: '', faqs: [], isActive: false, isDraft: true }
    });
  } catch (error) {
    console.error('Get legal page error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch page' });
  }
};

/**
 * PUT /api/admin/legal-pages/:slug
 * Upserts the page. FAQ slug takes `faqs`; the other two take `content`.
 */
const updateLegalPage = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!LegalPage.SLUGS.includes(slug)) {
      return res.status(404).json({ success: false, message: 'Unknown page' });
    }

    const { title, content, faqs, isActive } = req.body;
    const update = { lastUpdatedBy: req.user.id };

    if (title !== undefined) {
      const trimmed = String(title).trim();
      if (!trimmed) return res.status(400).json({ success: false, message: 'Title is required' });
      update.title = trimmed;
    }
    if (isActive !== undefined) update.isActive = Boolean(isActive);

    if (slug === 'faq') {
      if (faqs !== undefined) {
        if (!Array.isArray(faqs)) {
          return res.status(400).json({ success: false, message: 'faqs must be an array' });
        }
        for (const item of faqs) {
          if (!item?.question?.trim() || !item?.answer?.trim()) {
            return res.status(400).json({ success: false, message: 'Every FAQ needs a question and an answer' });
          }
        }
        update.faqs = faqs.map((f, i) => ({
          question: String(f.question).trim(),
          answer: String(f.answer).trim(),
          order: f.order ?? i
        }));
      }
    } else if (content !== undefined) {
      // A generous but finite cap — this is a legal document, not unbounded storage.
      if (String(content).length > 200000) {
        return res.status(400).json({ success: false, message: 'Content is too long' });
      }
      update.content = content;
    }

    // title can come from either $set (admin provided one) or $setOnInsert
    // (falling back to the default on first creation) — never both, which
    // Mongo rejects as a conflicting update on the same path.
    if (update.title === undefined) {
      update.title = DEFAULT_TITLES[slug];
    }

    const page = await LegalPage.findOneAndUpdate(
      { slug },
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({ success: true, message: 'Page saved', page });
  } catch (error) {
    console.error('Update legal page error:', error);
    res.status(500).json({ success: false, message: 'Failed to save page' });
  }
};

module.exports = { getAllLegalPages, getLegalPage, updateLegalPage };
