const ScrapType = require('../models/ScrapType');
const ScrapRateHistory = require('../models/ScrapRateHistory');
const Scrap = require('../models/Scrap');
const { sanitizeDetailFields } = require('../utils/detailFields');

const slugify = (text) =>
  String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

const uniqueSlug = async (name, excludeId = null) => {
  const base = slugify(name) || 'scrap';
  let slug = base;
  let n = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await ScrapType.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) slug = `${base}-${n++}`;
  return slug;
};

const toPublic = (t) => ({
  id: t._id,
  name: t.name,
  slug: t.slug,
  group: t.group,
  image: t.image,
  info: t.info,
  pricingMode: t.pricingMode,
  unit: t.unit,
  ratePerUnit: t.ratePerUnit,
  minQuantity: t.minQuantity,
  requiresPhoto: t.requiresPhoto,
  detailFields: t.detailFields || [],
  rateUpdatedAt: t.rateUpdatedAt
});

/** GET /scrap/types: what customers can sell, in the order the admin set (a group sits where its first type is) */
exports.listScrapTypes = async (req, res) => {
  try {
    const types = await ScrapType.find({ isActive: true }).sort({ order: 1, name: 1 }).lean();
    res.json({ success: true, data: types.map(toPublic) });
  } catch (error) {
    console.error('List scrap types error:', error);
    res.status(500).json({ success: false, message: 'Failed to load scrap types' });
  }
};

/** GET /scrap/admin/types: every type, including switched-off ones */
exports.adminListTypes = async (req, res) => {
  try {
    const types = await ScrapType.find({}).sort({ order: 1, name: 1 }).lean();
    res.json({ success: true, data: types });
  } catch (error) {
    console.error('Admin list scrap types error:', error);
    res.status(500).json({ success: false, message: 'Failed to load scrap types' });
  }
};

// Validates the editable fields. `partial` only checks what was sent (used by update).
const readFields = (body, partial) => {
  const out = {};
  const bad = (message) => ({ error: message });

  if (!partial || body.name !== undefined) {
    const name = String(body.name || '').trim();
    if (!name) return bad('Name is required');
    out.name = name.slice(0, 80);
  }
  if (body.group !== undefined) out.group = String(body.group || '').trim().slice(0, 60) || 'Other';
  if (body.image !== undefined) out.image = String(body.image || '').trim();
  if (body.info !== undefined) out.info = String(body.info || '').trim().slice(0, 500);
  if (body.requiresPhoto !== undefined) out.requiresPhoto = body.requiresPhoto === true;
  if (body.isActive !== undefined) out.isActive = body.isActive === true;

  if (body.pricingMode !== undefined) {
    if (!['per_unit', 'quote'].includes(body.pricingMode)) return bad('Pricing must be a posted rate or a quote');
    out.pricingMode = body.pricingMode;
  }
  if (body.unit !== undefined) {
    if (!['kg', 'piece'].includes(body.unit)) return bad('Unit must be kg or piece');
    out.unit = body.unit;
  }
  for (const key of ['ratePerUnit', 'minQuantity', 'order']) {
    if (body[key] === undefined) continue;
    const n = Number(body[key]);
    if (!Number.isFinite(n) || n < 0 || n > 10000000) return bad(`${key === 'ratePerUnit' ? 'Rate' : key === 'minQuantity' ? 'Minimum quantity' : 'Order'} must be a number of 0 or more`);
    out[key] = key === 'order' ? Math.round(n) : Math.round(n * 100) / 100;
  }

  if (body.detailFields !== undefined) {
    const result = sanitizeDetailFields(body.detailFields);
    if (result.error) return bad(result.error);
    out.detailFields = result.fields;
  }
  return { fields: out };
};

/** POST /scrap/admin/types */
exports.adminCreateType = async (req, res) => {
  try {
    const { fields, error } = readFields(req.body || {}, false);
    if (error) return res.status(400).json({ success: false, message: error });

    if (fields.pricingMode === 'quote') {
      fields.unit = 'piece';
      fields.ratePerUnit = 0;
    } else if (!(fields.ratePerUnit > 0)) {
      return res.status(400).json({ success: false, message: 'Enter the rate for this scrap type' });
    }

    const type = await ScrapType.create({
      ...fields,
      slug: await uniqueSlug(fields.name),
      rateUpdatedAt: fields.ratePerUnit > 0 ? new Date() : null
    });
    if (type.ratePerUnit > 0) {
      await ScrapRateHistory.create({ scrapTypeId: type._id, rate: type.ratePerUnit, previousRate: null, changedBy: req.user?.id || null });
    }
    res.status(201).json({ success: true, data: type });
  } catch (error) {
    console.error('Create scrap type error:', error);
    res.status(500).json({ success: false, message: 'Failed to create scrap type' });
  }
};

/** PUT /scrap/admin/types/:id: any subset of the fields (the rates table sends only the rate) */
exports.adminUpdateType = async (req, res) => {
  try {
    const type = await ScrapType.findById(req.params.id);
    if (!type) return res.status(404).json({ success: false, message: 'Scrap type not found' });

    const { fields, error } = readFields(req.body || {}, true);
    if (error) return res.status(400).json({ success: false, message: error });

    const previousRate = type.ratePerUnit;
    Object.assign(type, fields);

    if (type.pricingMode === 'quote') {
      type.unit = 'piece';
      type.ratePerUnit = 0;
    } else if (type.isActive && !(type.ratePerUnit > 0)) {
      return res.status(400).json({ success: false, message: 'A type that is switched on needs a rate' });
    }

    const rateChanged = type.pricingMode === 'per_unit' && type.ratePerUnit !== previousRate;
    if (rateChanged) type.rateUpdatedAt = new Date();
    if (fields.detailFields) type.markModified('detailFields');
    await type.save();

    if (rateChanged) {
      await ScrapRateHistory.create({ scrapTypeId: type._id, rate: type.ratePerUnit, previousRate, changedBy: req.user?.id || null });
    }
    res.json({ success: true, data: type });
  } catch (error) {
    console.error('Update scrap type error:', error);
    res.status(500).json({ success: false, message: 'Failed to update scrap type' });
  }
};

/** DELETE /scrap/admin/types/:id: removed if never used, otherwise just switched off */
exports.adminDeleteType = async (req, res) => {
  try {
    const type = await ScrapType.findById(req.params.id);
    if (!type) return res.status(404).json({ success: false, message: 'Scrap type not found' });

    const used = await Scrap.exists({ 'items.scrapTypeId': type._id });
    if (used) {
      type.isActive = false;
      await type.save();
      return res.json({ success: true, deactivated: true, message: 'This type has past requests, so it was switched off instead of deleted.' });
    }

    await ScrapRateHistory.deleteMany({ scrapTypeId: type._id });
    await type.deleteOne();
    res.json({ success: true, deactivated: false, message: 'Scrap type deleted' });
  } catch (error) {
    console.error('Delete scrap type error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete scrap type' });
  }
};

/** GET /scrap/admin/types/:id/history */
exports.adminTypeHistory = async (req, res) => {
  try {
    const rows = await ScrapRateHistory.find({ scrapTypeId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('changedBy', 'name email')
      .lean();
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Scrap rate history error:', error);
    res.status(500).json({ success: false, message: 'Failed to load rate history' });
  }
};
