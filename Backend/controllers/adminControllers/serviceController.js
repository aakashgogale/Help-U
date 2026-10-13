const Service = require('../../models/UserService');
const Brand = require('../../models/Brand');
const { validationResult } = require('express-validator');
const { SERVICE_STATUS } = require('../../utils/constants');
const { buildServiceContent } = require('../../utils/serviceContent');
const { validatePricingFields } = require('../../utils/servicePricing');

/**
 * Pulls the pricing-model fields out of a request body, applying sensible
 * defaults per type so a half-filled form never saves inconsistent data
 * (e.g. an hourly service with no rate).
 */
const buildPricingFields = (body) => {
  const pricingType = body.pricingType || 'fixed';
  const fields = { pricingType };

  if (pricingType === 'hourly') {
    fields.hourlyRate = body.hourlyRate !== undefined ? Number(body.hourlyRate) : Number(body.basePrice) || 0;
    fields.minHours = body.minHours !== undefined ? Number(body.minHours) : 1;
    fields.maxHours = body.maxHours !== undefined ? Number(body.maxHours) : 8;
  } else {
    fields.hourlyRate = null;
  }

  if (pricingType === 'inspection_fee') {
    fields.inspectionFee = Number(body.inspectionFee) || 0;
  } else {
    fields.inspectionFee = null;
  }

  fields.quoteContactNote = pricingType === 'quote_required' ? String(body.quoteContactNote || '').trim() : '';

  return fields;
};

/**
 * Get all services (with filter by brandId)
 * GET /api/admin/services
 */
const getAllServices = async (req, res) => {
  try {
    const { status, brandId } = req.query;

    const query = {};
    if (status) query.status = status;
    if (brandId) query.brandId = brandId;

    const services = await Service.find(query)
      .populate('brandId', 'title')
      .populate('categoryId', 'title')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: services.length,
      services
    });
  } catch (error) {
    console.error('Get all services error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services'
    });
  }
};

/**
 * Get single service by ID
 * GET /api/admin/services/:id
 */
const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('brandId', 'title')
      .populate('categoryId', 'title');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.status(200).json({
      success: true,
      service
    });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service'
    });
  }
};

/**
 * Create new service
 * POST /api/admin/services
 */
const createService = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      brandId,
      categoryId,
      title,
      basePrice,
      gstPercentage,
      description,
      status,
      iconUrl
    } = req.body;

    const pricingCheck = validatePricingFields(req.body);
    if (pricingCheck.error) {
      return res.status(400).json({ success: false, message: pricingCheck.error });
    }

    // Verify brand exists
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Try to create service
    // If slug collision happens within same brand, mongoose throws duplicate key error
    const service = await Service.create({
      brandId,
      categoryId,
      title,
      basePrice,
      gstPercentage: gstPercentage || 18,
      description,
      status: status || SERVICE_STATUS.ACTIVE,
      iconUrl,
      ...buildPricingFields(req.body),
      ...buildServiceContent(req.body)
    });

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      service
    });
  } catch (error) {
    // Handle duplicate slug error specifically
    if (error.code === 11000 && error.keyPattern && error.keyPattern.slug) {
      return res.status(409).json({
        success: false,
        message: 'A service with this name already exists for this brand.'
      });
    }

    console.error('Create service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create service'
    });
  }
};

/**
 * Update service
 * PUT /api/admin/services/:id
 */
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // If brandId is being updated, verify it exists
    if (updates.brandId) {
      const brand = await Brand.findById(updates.brandId);
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: 'Brand not found'
        });
      }
    }

    // Update fields
    if (updates.title) service.title = updates.title;
    if (updates.categoryId) service.categoryId = updates.categoryId;
    if (updates.basePrice !== undefined) service.basePrice = updates.basePrice;
    if (updates.gstPercentage !== undefined) service.gstPercentage = updates.gstPercentage;
    if (updates.description !== undefined) service.description = updates.description;
    if (updates.status) service.status = updates.status;
    if (updates.iconUrl !== undefined) service.iconUrl = updates.iconUrl;
    if (updates.brandId) service.brandId = updates.brandId;

    if (updates.pricingType !== undefined) {
      const pricingCheck = validatePricingFields({ ...service.toObject(), ...updates });
      if (pricingCheck.error) {
        return res.status(400).json({ success: false, message: pricingCheck.error });
      }
      Object.assign(service, buildPricingFields({ ...service.toObject(), ...updates }));
    } else if (['hourlyRate', 'minHours', 'maxHours', 'inspectionFee', 'quoteContactNote'].some((k) => updates[k] !== undefined)) {
      // Pricing type unchanged but one of its parameters was edited.
      const pricingCheck = validatePricingFields({ pricingType: service.pricingType, ...updates });
      if (pricingCheck.error) {
        return res.status(400).json({ success: false, message: pricingCheck.error });
      }
      if (updates.hourlyRate !== undefined) service.hourlyRate = Number(updates.hourlyRate);
      if (updates.minHours !== undefined) service.minHours = Number(updates.minHours);
      if (updates.maxHours !== undefined) service.maxHours = Number(updates.maxHours);
      if (updates.inspectionFee !== undefined) service.inspectionFee = Number(updates.inspectionFee);
      if (updates.quoteContactNote !== undefined) service.quoteContactNote = String(updates.quoteContactNote).trim();
    }

    // Detail content: only the keys present in the payload are applied.
    Object.assign(service, buildServiceContent(updates));

    // Slugs are auto-updated if title changes via pre-save hook? 
    // Wait, the pre-save hook only runs if slug is empty or we explicitly modify it?
    // In Mongoose schemas, I usually rely on logic. 
    // My previous Service.js schema had logic: if (this.isModified('title') && !this.slug)
    // This implies slug is created once.
    // If user changes title, slug might remain old? 
    // If they want to regenerate usage, they should clear slug?
    // UserService.js has: if (this.isModified('title') && !this.slug)
    // So updating title WON'T update slug unless slug is cleared.
    // This is generally safer for URLs.

    await service.save();

    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      service
    });
  } catch (error) {
    // Handle duplicate slug error specifically
    if (error.code === 11000 && error.keyPattern && error.keyPattern.slug) {
      return res.status(409).json({
        success: false,
        message: 'A service with this name already exists for this brand.'
      });
    }

    console.error('Update service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service'
    });
  }
};

/**
 * Delete service
 * DELETE /api/admin/services/:id
 */
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    // Hard delete as requested
    const service = await Service.findByIdAndDelete(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Service deleted permanently'
    });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete service'
    });
  }
};

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService
};
