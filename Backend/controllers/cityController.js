const City = require('../models/City');

// Helper wrapper to avoid repeating try-catch
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * @desc    Get all cities
 * @route   GET /api/admin/cities
 * @access  Private (Super Admin)
 */
exports.getAllCities = catchAsync(async (req, res) => {
  const cities = await City.find({}).sort({ displayOrder: 1, createdAt: -1 });

  res.status(200).json({
    success: true,
    count: cities.length,
    cities
  });
});

/**
 * @desc    Get active cities (Public)
 * @route   GET /api/public/cities
 * @access  Public
 */
exports.getActiveCities = catchAsync(async (req, res) => {
  const cities = await City.find({ isActive: true })
    .select('name slug state location serviceRadius isDefault currency timezone')
    .sort({ displayOrder: 1, name: 1 });

  res.status(200).json({
    success: true,
    count: cities.length,
    cities
  });
});

/**
 * @desc    Get single city
 * @route   GET /api/admin/cities/:id
 * @access  Private (Super Admin)
 */
exports.getCity = catchAsync(async (req, res) => {
  const city = await City.findById(req.params.id);

  if (!city) {
    return res.status(404).json({
      success: false,
      message: 'City not found'
    });
  }

  res.status(200).json({
    success: true,
    city
  });
});

/**
 * @desc    Create new city
 * @route   POST /api/admin/cities
 * @access  Private (Super Admin)
 */
exports.createCity = catchAsync(async (req, res) => {
  req.body.createdBy = req.user.id;

  const city = await City.create(req.body);

  res.status(201).json({
    success: true,
    message: 'City created successfully',
    city
  });
});

/**
 * @desc    Update city
 * @route   PUT /api/admin/cities/:id
 * @access  Private (Super Admin)
 */
exports.updateCity = catchAsync(async (req, res) => {
  let city = await City.findById(req.params.id);

  if (!city) {
    return res.status(404).json({
      success: false,
      message: 'City not found'
    });
  }

  city = await City.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    message: 'City updated successfully',
    city
  });
});

/**
 * @desc    Delete city
 * @route   DELETE /api/admin/cities/:id
 * @access  Private (Super Admin)
 */
exports.deleteCity = catchAsync(async (req, res) => {
  const city = await City.findById(req.params.id);

  if (!city) {
    return res.status(404).json({
      success: false,
      message: 'City not found'
    });
  }

  // Prevent deleting the default city
  if (city.isDefault) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete the default city. Please set another city as default first.'
    });
  }

  await city.deleteOne();

  res.status(200).json({
    success: true,
    message: 'City deleted successfully'
  });
});

/**
 * @desc    Toggle city status
 * @route   PATCH /api/admin/cities/:id/status
 * @access  Private (Super Admin)
 */
exports.toggleCityStatus = catchAsync(async (req, res) => {
  const city = await City.findById(req.params.id);

  if (!city) {
    return res.status(404).json({
      success: false,
      message: 'City not found'
    });
  }

  // Prevent deactivating the default city
  if (city.isDefault && city.isActive) {
    return res.status(400).json({
      success: false,
      message: 'Cannot deactivate the default city.'
    });
  }

  city.isActive = !city.isActive;
  await city.save();

  res.status(200).json({
    success: true,
    message: `City ${city.isActive ? 'activated' : 'deactivated'} successfully`,
    city
  });
});

/**
 * @desc    Get areas of a city
 * @route   GET /api/admin/cities/:cityId/areas OR /api/public/cities/:cityId/areas
 */
exports.getCityAreas = catchAsync(async (req, res) => {
  const Area = require('../models/Area');
  const { cityId } = req.params;

  const areas = await Area.find({ cityId }).sort({ name: 1 });

  res.status(200).json({
    success: true,
    count: areas.length,
    areas
  });
});

/**
 * @desc    Create area for a city
 * @route   POST /api/admin/cities/:cityId/areas
 */
exports.createArea = catchAsync(async (req, res) => {
  const Area = require('../models/Area');
  const { cityId } = req.params;
  const { name, pincode, serviceAvailable = true } = req.body;

  if (!name || !pincode) {
    return res.status(400).json({
      success: false,
      message: 'Area name and pincode are required'
    });
  }

  const area = await Area.create({
    name,
    pincode: String(pincode).trim(),
    cityId,
    serviceAvailable
  });

  res.status(201).json({
    success: true,
    message: 'Area created successfully',
    area
  });
});

/**
 * @desc    Update area
 * @route   PUT /api/admin/cities/:cityId/areas/:areaId
 */
exports.updateArea = catchAsync(async (req, res) => {
  const Area = require('../models/Area');
  const { areaId } = req.params;

  const area = await Area.findByIdAndUpdate(areaId, req.body, {
    new: true,
    runValidators: true
  });

  if (!area) {
    return res.status(404).json({
      success: false,
      message: 'Area not found'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Area updated successfully',
    area
  });
});

/**
 * @desc    Delete area
 * @route   DELETE /api/admin/cities/:cityId/areas/:areaId
 */
exports.deleteArea = catchAsync(async (req, res) => {
  const Area = require('../models/Area');
  const { areaId } = req.params;

  const area = await Area.findByIdAndDelete(areaId);

  if (!area) {
    return res.status(404).json({
      success: false,
      message: 'Area not found'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Area deleted successfully'
  });
});

/**
 * @desc    Check service availability by pincode (Public)
 * @route   GET /api/public/cities/check-pincode
 */
exports.checkPincodeAvailability = catchAsync(async (req, res) => {
  const Area = require('../models/Area');
  const { pincode, cityId } = req.query;

  if (!pincode) {
    return res.status(400).json({
      success: false,
      message: 'Pincode is required'
    });
  }

  const cleanPincode = String(pincode).trim();
  const query = { pincode: cleanPincode, isActive: true };
  if (cityId) query.cityId = cityId;

  const area = await Area.findOne(query).populate('cityId', 'name state country').lean();

  if (!area) {
    // If no specific area configured, check if city exists
    return res.status(200).json({
      success: true,
      serviceable: false,
      message: `Services are not currently available at pincode ${cleanPincode}`,
      pincode: cleanPincode
    });
  }

  const isAvailable = Boolean(area.serviceAvailable);

  res.status(200).json({
    success: true,
    serviceable: isAvailable,
    message: isAvailable
      ? `Services are available in ${area.name}, ${area.cityId?.name || ''}`
      : `Services are temporarily unavailable in ${area.name}`,
    area: {
      id: area._id,
      name: area.name,
      pincode: area.pincode,
      city: area.cityId?.name,
      state: area.cityId?.state
    }
  });
});
