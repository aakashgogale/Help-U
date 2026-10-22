/**
 * Admin Coupon Controller
 *
 * CRUD for discount codes.
 */

const Coupon = require('../../models/Coupon');
const CouponRedemption = require('../../models/CouponRedemption');

/**
 * Pulls the writable fields out of a payload, leaving anything absent alone.
 * usedCount is deliberately not writable — it is maintained by redemption.
 */
const buildPatch = (body = {}, { isCreate = false } = {}) => {
  const patch = {};
  const set = (key, value) => {
    if (value !== undefined) patch[key] = value;
  };

  if (body.code !== undefined) patch.code = String(body.code).trim().toUpperCase();
  set('title', body.title !== undefined ? String(body.title).trim() : undefined);
  set('description', body.description !== undefined ? String(body.description).trim() : undefined);
  set('discountType', body.discountType);
  if (body.discountValue !== undefined) patch.discountValue = Number(body.discountValue);
  if (body.maxDiscountAmount !== undefined) patch.maxDiscountAmount = Number(body.maxDiscountAmount) || 0;
  if (body.minOrderAmount !== undefined) patch.minOrderAmount = Number(body.minOrderAmount) || 0;
  if (body.validFrom !== undefined) patch.validFrom = body.validFrom;
  if (body.validUntil !== undefined) patch.validUntil = body.validUntil;
  if (body.usageLimit !== undefined) patch.usageLimit = Number(body.usageLimit) || 0;
  if (body.usageLimitPerUser !== undefined) patch.usageLimitPerUser = Number(body.usageLimitPerUser) || 0;
  if (body.categories !== undefined) patch.categories = Array.isArray(body.categories) ? body.categories : [];
  if (body.services !== undefined) patch.services = Array.isArray(body.services) ? body.services : [];
  if (body.cities !== undefined) patch.cities = Array.isArray(body.cities) ? body.cities : [];
  if (body.zones !== undefined || body.zoneIds !== undefined) {
    const rawZones = body.zones !== undefined ? body.zones : body.zoneIds;
    patch.zones = Array.isArray(rawZones) ? rawZones : [];
  }
  if (body.firstBookingOnly !== undefined) patch.firstBookingOnly = Boolean(body.firstBookingOnly);
  if (body.isAutoApply !== undefined) patch.isAutoApply = Boolean(body.isAutoApply);
  if (body.isActive !== undefined) patch.isActive = Boolean(body.isActive);

  if (isCreate) {
    if (patch.validFrom === undefined) patch.validFrom = new Date();
    if (patch.isActive === undefined) patch.isActive = true;
  }

  return patch;
};

/**
 * Rejects values that would produce a nonsensical coupon.
 */
const validatePatch = (patch, existing = {}) => {
  const discountType = patch.discountType ?? existing.discountType;
  const discountValue = patch.discountValue ?? existing.discountValue;

  if (!discountType || !['percentage', 'fixed'].includes(discountType)) {
    return 'Discount type must be either percentage or fixed';
  }

  if (discountValue === undefined || Number.isNaN(discountValue) || discountValue <= 0) {
    return 'Discount value must be greater than zero';
  }

  if (discountType === 'percentage' && discountValue > 100) {
    return 'A percentage discount cannot exceed 100';
  }

  const validFrom = patch.validFrom ?? existing.validFrom;
  const validUntil = patch.validUntil ?? existing.validUntil;
  if (validUntil && validFrom && new Date(validUntil) <= new Date(validFrom)) {
    return 'The expiry date must be after the start date';
  }

  return null;
};

exports.list = async (req, res) => {
  try {
    const { status, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

    const query = {};
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    if (status === 'expired') query.validUntil = { $lt: new Date() };
    if (search) {
      const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { code: { $regex: safe, $options: 'i' } },
        { title: { $regex: safe, $options: 'i' } }
      ];
    }

    const [coupons, total] = await Promise.all([
      Coupon.find(query)
        .populate('zones', 'name')
        .populate('cities', 'name')
        .populate('categories', 'name title')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Coupon.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      coupons,
      total,
      page,
      pages: Math.ceil(total / limit) || 1
    });
  } catch (error) {
    console.error('Error listing coupons:', error);
    res.status(500).json({ success: false, message: 'Failed to load coupons' });
  }
};

exports.create = async (req, res) => {
  try {
    const patch = buildPatch(req.body, { isCreate: true });

    if (!patch.code) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }
    if (!patch.title) {
      return res.status(400).json({ success: false, message: 'Coupon title is required' });
    }
    if (!patch.validUntil) {
      return res.status(400).json({ success: false, message: 'Expiry date is required' });
    }

    const problem = validatePatch(patch);
    if (problem) {
      return res.status(400).json({ success: false, message: problem });
    }

    const coupon = await Coupon.create({ ...patch, createdBy: req.user?.id || null });

    res.status(201).json({ success: true, message: 'Coupon created', coupon });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A coupon with this code already exists'
      });
    }
    console.error('Error creating coupon:', error);
    res.status(500).json({ success: false, message: 'Failed to create coupon' });
  }
};

exports.update = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    const patch = buildPatch(req.body);
    const problem = validatePatch(patch, coupon.toObject());
    if (problem) {
      return res.status(400).json({ success: false, message: problem });
    }

    Object.assign(coupon, patch);
    await coupon.save();

    res.status(200).json({ success: true, message: 'Coupon updated', coupon });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A coupon with this code already exists'
      });
    }
    console.error('Error updating coupon:', error);
    res.status(500).json({ success: false, message: 'Failed to update coupon' });
  }
};

/**
 * Deactivates rather than deletes once a coupon has been used, so redemption
 * history keeps pointing at a coupon that still exists.
 */
exports.remove = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    if (coupon.usedCount > 0) {
      coupon.isActive = false;
      await coupon.save();
      return res.status(200).json({
        success: true,
        message: 'Coupon has been used, so it was deactivated instead of deleted',
        deactivated: true
      });
    }

    await coupon.deleteOne();
    res.status(200).json({ success: true, message: 'Coupon deleted' });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ success: false, message: 'Failed to delete coupon' });
  }
};

exports.stats = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id).lean();
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    const [redemptions, totals] = await Promise.all([
      CouponRedemption.find({ couponId: coupon._id })
        .populate('userId', 'name phone')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      CouponRedemption.aggregate([
        { $match: { couponId: coupon._id } },
        {
          $group: {
            _id: null,
            totalDiscount: { $sum: '$discountAmount' },
            totalOrderValue: { $sum: '$orderAmount' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const summary = totals[0] || { totalDiscount: 0, totalOrderValue: 0, count: 0 };

    res.status(200).json({
      success: true,
      coupon,
      summary,
      redemptions
    });
  } catch (error) {
    console.error('Error fetching coupon stats:', error);
    res.status(500).json({ success: false, message: 'Failed to load coupon stats' });
  }
};
