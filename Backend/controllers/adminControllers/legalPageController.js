const LegalPage = require('../../models/LegalPage');

const DEFAULT_TITLES = {
  'terms-and-conditions': 'Terms & Conditions',
  'privacy-policy': 'Privacy Policy',
  'cancellation-policy': 'Cancellation Policy',
  faq: 'Frequently Asked Questions',
  'worker-cancellation-policy': 'Cancellation Policy',
  'worker-faq': 'Frequently Asked Questions'
};

// Pages that are only a list of questions, and pages that show a list under their sections
const FAQ_SLUGS = ['faq', 'worker-faq'];
const POLICY_SLUGS = ['cancellation-policy', 'worker-cancellation-policy'];

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
      intro: '',
      sections: [],
      showUpdatedDate: true,
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
      page: page || { slug, title: DEFAULT_TITLES[slug], content: '', intro: '', sections: [], showUpdatedDate: true, faqs: [], isActive: false, isDraft: true }
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

    const { title, content, faqs, isActive, intro, sections, showUpdatedDate } = req.body;
    const update = { lastUpdatedBy: req.user.id };

    if (title !== undefined) {
      const trimmed = String(title).trim();
      if (!trimmed) return res.status(400).json({ success: false, message: 'Title is required' });
      update.title = trimmed;
    }
    if (isActive !== undefined) update.isActive = Boolean(isActive);
    if (showUpdatedDate !== undefined) update.showUpdatedDate = Boolean(showUpdatedDate);

    // FAQs: the FAQ page, and the cancellation policy (which shows them under the timeline)
    if (faqs !== undefined && (FAQ_SLUGS.includes(slug) || POLICY_SLUGS.includes(slug))) {
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

    if (!FAQ_SLUGS.includes(slug)) {
      if (intro !== undefined) {
        if (String(intro).length > 2000) {
          return res.status(400).json({ success: false, message: 'The summary is too long (2000 characters at most)' });
        }
        update.intro = String(intro).trim();
      }

      if (sections !== undefined) {
        if (!Array.isArray(sections) || sections.length > 60) {
          return res.status(400).json({ success: false, message: 'A page can have up to 60 sections' });
        }
        for (const item of sections) {
          if (!item?.title?.trim()) {
            return res.status(400).json({ success: false, message: 'Every section needs a heading' });
          }
          if (String(item.body || '').length > 20000) {
            return res.status(400).json({ success: false, message: `The text of "${item.title}" is too long` });
          }
        }
        update.sections = sections.map((item) => ({
          title: String(item.title).trim().slice(0, 150),
          body: String(item.body || '').replace(/\r\n/g, '\n').trim(),
          isVisible: item.isVisible !== false
        }));
      }

      // Older pages are one block of HTML; kept so they can be converted into sections
      if (content !== undefined) {
        if (String(content).length > 200000) {
          return res.status(400).json({ success: false, message: 'Content is too long' });
        }
        update.content = content;
      }
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
