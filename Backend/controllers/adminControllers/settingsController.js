const Settings = require('../../models/Settings');
const Vendor = require('../../models/Vendor');

// Get Global Settings
exports.getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne({ type: 'global' });
    if (!settings) {
      settings = await Settings.findOne();
    }

    // If no settings exist yet, create default
    if (!settings) {
      settings = await Settings.create({ type: 'global' });
    } else if (!settings.type) {
      settings.type = 'global';
      await settings.save();
    }

    res.status(200).json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
};

// Update Global Settings
exports.updateSettings = async (req, res, next) => {
  try {
    const {
      visitedCharges,
      serviceGstPercentage,
      partsGstPercentage,
      servicePayoutPercentage,
      partsPayoutPercentage,
      tdsPercentage,
      platformFeePercentage,
      vendorCashLimit, // Add this
      cancellationPenalty,
      razorpayKeyId,
      razorpayKeySecret,
      razorpayWebhookSecret,
      cloudinaryCloudName,
      cloudinaryApiKey,
      cloudinaryApiSecret,
      // Billing Settings
      companyName, companyGSTIN, companyPAN, companyAddress, companyCity, companyState, companyPincode, companyPhone, companyEmail, invoicePrefix, sacCode,
      // Support Settings
      supportEmail, supportPhone, supportWhatsapp,
      // Booking Timing
      maxSearchTime, waveDuration, searchRadius,
      // Payment Control
      isOnlinePaymentEnabled,
      // Scrap Control
      isScrapEnabled
    } = req.body;

    let settings = await Settings.findOne({ type: 'global' });
    if (!settings) {
      settings = await Settings.findOne();
    }

    if (!settings) {
      settings = await Settings.create({
        type: 'global',
        visitedCharges,
        serviceGstPercentage,
        partsGstPercentage,
        servicePayoutPercentage,
        partsPayoutPercentage,
        tdsPercentage,
        platformFeePercentage,
        vendorCashLimit, // Add this
        cancellationPenalty,
        razorpayKeyId,
        razorpayKeySecret,
        razorpayWebhookSecret,
        cloudinaryCloudName,
        cloudinaryApiKey,
        cloudinaryApiSecret,
        isOnlinePaymentEnabled: isOnlinePaymentEnabled !== undefined ? isOnlinePaymentEnabled : true,
        isScrapEnabled: isScrapEnabled !== undefined ? isScrapEnabled : true
      });
    } else {
      if (!settings.type) settings.type = 'global';
      // Update fields if provided
      if (visitedCharges !== undefined) settings.visitedCharges = visitedCharges;
      if (serviceGstPercentage !== undefined) settings.serviceGstPercentage = serviceGstPercentage;
      if (partsGstPercentage !== undefined) settings.partsGstPercentage = partsGstPercentage;
      if (servicePayoutPercentage !== undefined) settings.servicePayoutPercentage = servicePayoutPercentage;
      if (partsPayoutPercentage !== undefined) settings.partsPayoutPercentage = partsPayoutPercentage;
      if (tdsPercentage !== undefined) settings.tdsPercentage = tdsPercentage;
      if (platformFeePercentage !== undefined) settings.platformFeePercentage = platformFeePercentage;
      if (vendorCashLimit !== undefined) settings.vendorCashLimit = vendorCashLimit; // Add this
      if (cancellationPenalty !== undefined) settings.cancellationPenalty = cancellationPenalty;
      if (razorpayKeyId !== undefined) settings.razorpayKeyId = razorpayKeyId;
      if (razorpayKeySecret !== undefined) settings.razorpayKeySecret = razorpayKeySecret;
      if (razorpayWebhookSecret !== undefined) settings.razorpayWebhookSecret = razorpayWebhookSecret;
      if (cloudinaryCloudName !== undefined) settings.cloudinaryCloudName = cloudinaryCloudName;
      if (cloudinaryApiKey !== undefined) settings.cloudinaryApiKey = cloudinaryApiKey;
      if (cloudinaryApiSecret !== undefined) settings.cloudinaryApiSecret = cloudinaryApiSecret;

      // Billing update
      if (companyName !== undefined) settings.companyName = companyName;
      if (companyGSTIN !== undefined) settings.companyGSTIN = companyGSTIN;
      if (companyPAN !== undefined) settings.companyPAN = companyPAN;
      if (companyAddress !== undefined) settings.companyAddress = companyAddress;
      if (companyCity !== undefined) settings.companyCity = companyCity;
      if (companyState !== undefined) settings.companyState = companyState;
      if (companyPincode !== undefined) settings.companyPincode = companyPincode;
      if (companyPhone !== undefined) settings.companyPhone = companyPhone;
      if (companyEmail !== undefined) settings.companyEmail = companyEmail;
      if (invoicePrefix !== undefined) settings.invoicePrefix = invoicePrefix;
      if (sacCode !== undefined) settings.sacCode = sacCode;

      // Support update
      if (supportEmail !== undefined) settings.supportEmail = supportEmail;
      if (supportPhone !== undefined) settings.supportPhone = supportPhone;
      if (supportWhatsapp !== undefined) settings.supportWhatsapp = supportWhatsapp;

      // Booking Timing update
      if (maxSearchTime !== undefined) settings.maxSearchTime = maxSearchTime;
      if (waveDuration !== undefined) settings.waveDuration = waveDuration;
      if (searchRadius !== undefined) settings.searchRadius = searchRadius;
      if (isOnlinePaymentEnabled !== undefined) settings.isOnlinePaymentEnabled = Boolean(isOnlinePaymentEnabled);
      if (isScrapEnabled !== undefined) settings.isScrapEnabled = Boolean(isScrapEnabled);

      await settings.save();
    }

    // Broadcast updated configuration to all connected clients via Socket.io
    try {
      const { getIO } = require('../../sockets');
      const io = getIO();
      if (io) {
        io.emit('system_config_updated', {
          isOnlinePaymentEnabled: settings.isOnlinePaymentEnabled !== false,
          isScrapEnabled: settings.isScrapEnabled !== false
        });
      }
    } catch (socketErr) {
      // Non-blocking socket broadcast error
    }

    // Propagate vendorCashLimit to all existing vendors if it was changed
    if (vendorCashLimit !== undefined) {
      console.log(`Updating all vendors with new cash limit: ${vendorCashLimit}`);
      await Vendor.updateMany(
        {}, // Filter: all vendors
        { $set: { 'wallet.cashLimit': vendorCashLimit } }
      );
    }

    // Propagate searchRadius to all existing vendors if it was changed
    if (searchRadius !== undefined) {
      console.log(`Updating all vendors with new service range: ${searchRadius}`);
      await Vendor.updateMany(
        {},
        { $set: { 'settings.serviceRange': searchRadius } }
      );
    }

    res.status(200).json({
      success: true,
      message: 'System settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
};
// Get Public Settings (Visited Charges, GST, Features)
exports.getPublicSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne({ type: 'global' });
    if (!settings) {
      settings = await Settings.findOne();
    }

    // Default if not found (fallback values)
    if (!settings) {
      settings = { visitedCharges: 29, serviceGstPercentage: 18, partsGstPercentage: 18, isScrapEnabled: true, isOnlinePaymentEnabled: true };
    }

    res.status(200).json({
      success: true,
      settings: {
        visitedCharges: settings.visitedCharges || 0,
        serviceGstPercentage: settings.serviceGstPercentage ?? 18,
        partsGstPercentage: settings.partsGstPercentage ?? 18,
        supportEmail: settings.supportEmail || '',
        supportPhone: settings.supportPhone || '',
        supportWhatsapp: settings.supportWhatsapp || '',
        cancellationPenalty: settings.cancellationPenalty ?? 49,
        companyName: settings.companyName || 'TodayMyDream',
        companyAddress: settings.companyAddress || '',
        companyCity: settings.companyCity || '',
        companyState: settings.companyState || '',
        companyPincode: settings.companyPincode || '',
        companyPhone: settings.companyPhone || '',
        companyEmail: settings.companyEmail || '',
        isOnlinePaymentEnabled: settings.isOnlinePaymentEnabled !== false,
        isScrapEnabled: settings.isScrapEnabled !== false
      }
    });
  } catch (error) {
    console.error('Error fetching public settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
};
