/**
 * Commission Rules (admin)
 *
 *   GET    /api/admin/commission-rules
 *   POST   /api/admin/commission-rules
 *   PUT    /api/admin/commission-rules/:id
 *   DELETE /api/admin/commission-rules/:id
 *   GET    /api/admin/commission-rules/preview?workerId=&categoryId=&serviceAmount=&partsAmount=
 *
 * The global default lives in Settings (servicePayoutPercentage, or
 * defaultCommissionType/defaultFixedCommission) and is edited on the Settings
 * and Booking Configuration pages.
 */

const mongoose = require('mongoose');
const CommissionRule = require('../../models/CommissionRule');
const { resolveCommission, computeWorkerEarnings } = require('../../services/commissionService');
const { getBookingConfig } = require('../../utils/bookingConfig');

const isId = (v) => v && mongoose.Types.ObjectId.isValid(String(v));

/**
 * Validates a rule payload. Returns { data, error }.
 */
const parseRule = (body) => {
  const scope = body.scope;
  if (!['category', 'worker', 'worker_category'].includes(scope)) return { error: 'Choose who the rule applies to' };

  const commissionType = body.commissionType;
  if (!['percentage', 'fixed'].includes(commissionType)) return { error: 'Choose percentage or fixed commission' };

  const commissionValue = Number(body.commissionValue);
  if (!Number.isFinite(commissionValue) || commissionValue < 0) return { error: 'Commission must be zero or more' };
  if (commissionType === 'percentage' && commissionValue > 100) return { error: 'A percentage commission cannot exceed 100' };

  const needsCategory = ['category', 'worker_category'].includes(scope);
  const needsWorker = ['worker', 'worker_category'].includes(scope);
  if (needsCategory && !isId(body.categoryId)) return { error: 'Choose a category' };
  if (needsWorker && !isId(body.workerId)) return { error: 'Choose a worker' };

  let partsPayoutPercentage = null;
  if (body.partsPayoutPercentage !== undefined && body.partsPayoutPercentage !== null && body.partsPayoutPercentage !== '') {
    partsPayoutPercentage = Number(body.partsPayoutPercentage);
    if (!Number.isFinite(partsPayoutPercentage) || partsPayoutPercentage < 0 || partsPayoutPercentage > 100) {
      return { error: 'Parts payout must be between 0 and 100' };
    }
  }

  return {
    data: {
      name: String(body.name || '').trim().slice(0, 120),
      scope,
      categoryId: needsCategory ? body.categoryId : null,
      workerId: needsWorker ? body.workerId : null,
      commissionType,
      commissionValue: Math.round(commissionValue * 100) / 100,
      partsPayoutPercentage,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      notes: String(body.notes || '').trim().slice(0, 500)
    }
  };
};

/**
 * Only one active rule may exist per target, otherwise which one applies would
 * be ambiguous.
 */
const findConflict = (data, excludeId = null) => {
  if (!data.isActive) return null;
  const query = {
    scope: data.scope,
    categoryId: data.categoryId || null,
    workerId: data.workerId || null,
    isActive: true
  };
  if (excludeId) query._id = { $ne: excludeId };
  return CommissionRule.findOne(query).lean();
};

exports.listRules = async (req, res) => {
  try {
    const query = {};
    if (['category', 'worker', 'worker_category'].includes(req.query.scope)) query.scope = req.query.scope;
    if (req.query.status === 'active') query.isActive = true;
    if (req.query.status === 'inactive') query.isActive = false;

    const [rules, config] = await Promise.all([
      CommissionRule.find(query)
        .populate('categoryId', 'title')
        .populate('workerId', 'name businessName phone')
        .sort({ updatedAt: -1 })
        .lean(),
      getBookingConfig()
    ]);

    res.status(200).json({
      success: true,
      data: rules,
      globalDefault: {
        commissionType: config.defaultCommissionType,
        percentageCommission: Math.round((100 - config.servicePayoutPercentage) * 100) / 100,
        servicePayoutPercentage: config.servicePayoutPercentage,
        fixedCommission: config.defaultFixedCommission,
        partsPayoutPercentage: config.partsPayoutPercentage
      }
    });
  } catch (error) {
    console.error('List commission rules error:', error);
    res.status(500).json({ success: false, message: 'Failed to load commission rules' });
  }
};

exports.createRule = async (req, res) => {
  try {
    const { data, error } = parseRule(req.body);
    if (error) return res.status(400).json({ success: false, message: error });

    if (await findConflict(data)) {
      return res.status(409).json({ success: false, message: 'An active rule already exists for this target. Edit or deactivate it first.' });
    }

    const rule = await CommissionRule.create({ ...data, createdBy: req.user.id });
    res.status(201).json({ success: true, message: 'Commission rule created', data: rule });
  } catch (error) {
    console.error('Create commission rule error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to create commission rule' });
  }
};

exports.updateRule = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ success: false, message: 'Rule not found' });

    const existing = await CommissionRule.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Rule not found' });

    const merged = { ...existing.toObject(), ...req.body };
    const { data, error } = parseRule(merged);
    if (error) return res.status(400).json({ success: false, message: error });

    if (await findConflict(data, existing._id)) {
      return res.status(409).json({ success: false, message: 'Another active rule already exists for this target.' });
    }

    Object.assign(existing, data);
    await existing.save();
    res.status(200).json({ success: true, message: 'Commission rule updated', data: existing });
  } catch (error) {
    console.error('Update commission rule error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to update commission rule' });
  }
};

/**
 * Past bills keep their commission snapshot, so deleting a rule never changes
 * historic earnings.
 */
exports.deleteRule = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ success: false, message: 'Rule not found' });
    const deleted = await CommissionRule.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Rule not found' });
    res.status(200).json({ success: true, message: 'Commission rule deleted' });
  } catch (error) {
    console.error('Delete commission rule error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete commission rule' });
  }
};

/**
 * Shows which rule would apply and the resulting split, so an admin can check
 * a rule before a real bill uses it.
 */
exports.previewCommission = async (req, res) => {
  try {
    const workerId = isId(req.query.workerId) ? req.query.workerId : null;
    const categoryId = isId(req.query.categoryId) ? req.query.categoryId : null;
    const serviceAmount = Math.max(0, Number(req.query.serviceAmount) || 1000);
    const partsAmount = Math.max(0, Number(req.query.partsAmount) || 0);

    const commission = await resolveCommission({ workerId, categoryId });
    const earnings = computeWorkerEarnings(commission, { serviceBase: serviceAmount, partsBase: partsAmount });

    res.status(200).json({
      success: true,
      data: {
        commission,
        serviceAmount,
        partsAmount,
        ...earnings,
        platformShare: Math.round((serviceAmount + partsAmount - earnings.vendorTotalEarning) * 100) / 100
      }
    });
  } catch (error) {
    console.error('Preview commission error:', error);
    res.status(500).json({ success: false, message: 'Failed to preview commission' });
  }
};
