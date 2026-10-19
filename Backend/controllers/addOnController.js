/**
 * Add-on Controller
 *
 *   Admin:  GET/POST /api/admin/addons, PUT/DELETE /api/admin/addons/:id
 *   Public: GET /api/public/booking-options?serviceId=   (checkout extras for a service)
 */

const mongoose = require('mongoose');
const AddOn = require('../models/AddOn');
const Service = require('../models/UserService');
const Category = require('../models/Category');
const { getBookingConfig } = require('../utils/bookingConfig');

const toIdList = (value) =>
  (Array.isArray(value) ? value : [])
    .map(String)
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

/**
 * Builds a clean add-on document from a request body. Returns { data, error }.
 */
const parseBody = (body, { partial = false } = {}) => {
  const data = {};

  if (!partial || body.title !== undefined) {
    const title = String(body.title || '').trim();
    if (!title) return { error: 'Title is required' };
    data.title = title.slice(0, 120);
  }
  if (!partial || body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) return { error: 'Price must be zero or more' };
    data.price = Math.round(price * 100) / 100;
  }
  if (body.description !== undefined) data.description = String(body.description || '').trim().slice(0, 500);
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl || null;
  if (body.maxQuantity !== undefined) {
    const max = parseInt(body.maxQuantity, 10);
    if (!Number.isInteger(max) || max < 1 || max > 20) return { error: 'Max quantity must be between 1 and 20' };
    data.maxQuantity = max;
  }
  if (body.appliesToAll !== undefined) data.appliesToAll = Boolean(body.appliesToAll);
  if (body.categoryIds !== undefined) data.categoryIds = toIdList(body.categoryIds);
  if (body.serviceIds !== undefined) data.serviceIds = toIdList(body.serviceIds);
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  if (body.sortOrder !== undefined) data.sortOrder = parseInt(body.sortOrder, 10) || 0;

  return { data };
};

const hasTarget = (doc) => doc.appliesToAll || (doc.categoryIds?.length || 0) > 0 || (doc.serviceIds?.length || 0) > 0;

exports.listAddOns = async (req, res) => {
  try {
    const query = {};
    if (req.query.status === 'active') query.isActive = true;
    if (req.query.status === 'inactive') query.isActive = false;
    if (req.query.q) {
      const escaped = String(req.query.q).trim().slice(0, 50).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.title = { $regex: escaped, $options: 'i' };
    }

    const addOns = await AddOn.find(query)
      .populate('categoryIds', 'title')
      .populate('serviceIds', 'title')
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: addOns });
  } catch (error) {
    console.error('List add-ons error:', error);
    res.status(500).json({ success: false, message: 'Failed to load add-ons' });
  }
};

exports.createAddOn = async (req, res) => {
  try {
    const { data, error } = parseBody(req.body);
    if (error) return res.status(400).json({ success: false, message: error });
    if (!hasTarget(data)) {
      return res.status(400).json({ success: false, message: 'Choose the categories or services this add-on is offered on, or make it available on all services' });
    }

    const addOn = await AddOn.create({ ...data, createdBy: req.user.id });
    res.status(201).json({ success: true, message: 'Add-on created', data: addOn });
  } catch (error) {
    console.error('Create add-on error:', error);
    res.status(500).json({ success: false, message: 'Failed to create add-on' });
  }
};

exports.updateAddOn = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Add-on not found' });
    }
    const { data, error } = parseBody(req.body, { partial: true });
    if (error) return res.status(400).json({ success: false, message: error });

    const addOn = await AddOn.findById(req.params.id);
    if (!addOn) return res.status(404).json({ success: false, message: 'Add-on not found' });

    Object.assign(addOn, data);
    if (!hasTarget(addOn)) {
      return res.status(400).json({ success: false, message: 'Choose the categories or services this add-on is offered on, or make it available on all services' });
    }
    await addOn.save();

    res.status(200).json({ success: true, message: 'Add-on updated', data: addOn });
  } catch (error) {
    console.error('Update add-on error:', error);
    res.status(500).json({ success: false, message: 'Failed to update add-on' });
  }
};

/**
 * Deleting is safe for past bookings: they keep a copy of the add-on's title
 * and price.
 */
exports.deleteAddOn = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Add-on not found' });
    }
    const deleted = await AddOn.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Add-on not found' });
    res.status(200).json({ success: true, message: 'Add-on deleted' });
  } catch (error) {
    console.error('Delete add-on error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete add-on' });
  }
};

/**
 * Public: checkout options for a service — the add-ons the customer can pick
 * and whether emergency booking is offered.
 *
 *   GET /api/public/booking-options?serviceId=
 */
exports.getBookingOptions = async (req, res) => {
  try {
    const { serviceId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ success: false, message: 'Valid serviceId is required' });
    }

    const [config, service] = await Promise.all([
      getBookingConfig(),
      Service.findById(serviceId).select('categoryId categoryIds category').lean()
    ]);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });

    const categoryId = service.categoryId || service.categoryIds?.[0] || null;
    let category = categoryId ? await Category.findById(categoryId).select('isEmergencyAvailable').lean() : null;
    if (!category && service.category) {
      // Title-fallback is scoped to top-level categories so a newly created
      // sub-category (which can share a title with a sibling via different
      // namespaced slugs) can't accidentally resolve as the emergency anchor.
      category = await Category.findOne({ title: service.category, parentId: null }).select('_id isEmergencyAvailable').lean();
    }

    const addOns = config.isAddOnsEnabled
      ? await AddOn.findApplicable({ serviceId, categoryId: categoryId || category?._id || null })
      : [];

    res.status(200).json({
      success: true,
      data: {
        addOns: addOns.map((a) => ({
          _id: a._id,
          title: a.title,
          description: a.description,
          price: a.price,
          imageUrl: a.imageUrl,
          maxQuantity: a.maxQuantity
        })),
        emergency: {
          available: config.isEmergencyEnabled && !!category?.isEmergencyAvailable,
          surchargeType: config.emergencySurchargeType,
          surchargeValue: config.emergencySurchargeValue
        }
      }
    });
  } catch (error) {
    console.error('Get booking options error:', error);
    res.status(500).json({ success: false, message: 'Failed to load booking options' });
  }
};
