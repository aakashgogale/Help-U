const Plan = require('../models/Plan');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const UserService = require('../models/UserService');
const Service = require('../models/Service');

// Create Plan
exports.createPlan = async (req, res) => {
  try {
    const {
      name,
      tagline,
      description,
      price,
      validityMonths,
      validityDays,
      duration,
      highlights,
      freeCategories,
      freeServices,
      bonusServices,
      isActive,
      isPopular,
      sortOrder
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Plan name is required' });
    }

    if (price === undefined || price === null || isNaN(price)) {
      return res.status(400).json({ success: false, message: 'Valid plan price is required' });
    }

    // Check if plan exists with same name
    const existingPlan = await Plan.findOne({ name: name.trim() });
    if (existingPlan) {
      return res.status(400).json({
        success: false,
        message: `Plan with name "${name.trim()}" already exists. Please choose a different name or edit the existing plan.`
      });
    }

    const months = Number(validityMonths) > 0 ? Number(validityMonths) : 1;
    const days = Number(validityDays) > 0 ? Number(validityDays) : (months * 30);
    const durationLabel = duration && duration.trim()
      ? duration.trim()
      : `${months} ${months === 1 ? 'Month' : 'Months'}`;

    const plan = new Plan({
      name: name.trim(),
      tagline: tagline ? tagline.trim() : '',
      description: description ? description.trim() : '',
      price: Number(price),
      validityMonths: months,
      validityDays: days,
      duration: durationLabel,
      highlights: Array.isArray(highlights) ? highlights.filter(h => h && String(h).trim()) : [],
      freeCategories: freeCategories || [],
      freeServices: freeServices || [],
      bonusServices: bonusServices || [],
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      isPopular: Boolean(isPopular),
      sortOrder: Number(sortOrder) || 0
    });

    await plan.save();

    // Populate references before returning
    const populatedPlan = await Plan.findById(plan._id)
      .populate('freeCategories', 'title')
      .populate({
        path: 'freeServices',
        select: 'title categoryId basePrice price',
        populate: { path: 'categoryId', select: 'title' }
      })
      .populate({
        path: 'bonusServices',
        populate: [
          { path: 'categoryId', select: 'title' },
          { path: 'serviceId', select: 'title basePrice price iconUrl description categoryId brandId status' }
        ]
      });

    res.status(201).json({ success: true, data: populatedPlan || plan });
  } catch (error) {
    console.error('Create Plan Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

// Get All Plans (Public/User/Admin)
exports.getAllPlans = async (req, res) => {
  try {
    const filter = {};
    if (req.query.activeOnly === 'true') {
      filter.isActive = true;
    }

    const plans = await Plan.find(filter)
      .populate('freeCategories', 'title')
      .populate({
        path: 'freeServices',
        select: 'title categoryId basePrice price',
        populate: { path: 'categoryId', select: 'title' }
      })
      .populate({
        path: 'bonusServices',
        populate: [
          { path: 'categoryId', select: 'title' },
          { path: 'serviceId', select: 'title basePrice price iconUrl description categoryId brandId status' }
        ]
      })
      .sort({ sortOrder: 1, price: 1 });

    res.status(200).json({ success: true, data: plans });
  } catch (error) {
    console.error('Get All Plans Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

// Get Single Plan
exports.getPlanById = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id)
      .populate('freeCategories', 'title')
      .populate({
        path: 'freeServices',
        select: 'title categoryId basePrice price',
        populate: { path: 'categoryId', select: 'title' }
      })
      .populate({
        path: 'bonusServices',
        populate: [
          { path: 'categoryId', select: 'title' },
          { path: 'serviceId', select: 'title basePrice price iconUrl description categoryId brandId status' }
        ]
      });

    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.status(200).json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Plan
exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Format fields if present
    if (updateData.name) {
      updateData.name = updateData.name.trim();
    }

    if (updateData.price !== undefined) {
      updateData.price = Number(updateData.price);
    }

    if (updateData.validityMonths !== undefined) {
      const months = Number(updateData.validityMonths) > 0 ? Number(updateData.validityMonths) : 1;
      updateData.validityMonths = months;
      if (!updateData.validityDays) {
        updateData.validityDays = months * 30;
      }
      if (!updateData.duration) {
        updateData.duration = `${months} ${months === 1 ? 'Month' : 'Months'}`;
      }
    }

    if (updateData.highlights && Array.isArray(updateData.highlights)) {
      updateData.highlights = updateData.highlights.filter(h => h && String(h).trim());
    }

    const plan = await Plan.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .populate('freeCategories', 'title')
      .populate({
        path: 'freeServices',
        select: 'title categoryId basePrice price',
        populate: { path: 'categoryId', select: 'title' }
      })
      .populate({
        path: 'bonusServices',
        populate: [
          { path: 'categoryId', select: 'title' },
          { path: 'serviceId', select: 'title basePrice price iconUrl description categoryId brandId status' }
        ]
      });

    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.status(200).json({ success: true, data: plan });
  } catch (error) {
    console.error('Update Plan Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

// Delete Plan
exports.deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.status(200).json({ success: true, message: 'Plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

