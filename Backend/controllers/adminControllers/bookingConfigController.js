/**
 * Booking Configuration (admin)
 *
 *   GET /api/admin/booking-config
 *   PUT /api/admin/booking-config   (partial updates; unknown keys ignored)
 *
 * Covers notes, problem media, add-ons, emergency bookings, chat, disputes,
 * worker assignment, commission defaults, payouts and recurring bookings.
 */

const Settings = require('../../models/Settings');
const {
  getBookingConfig,
  getPublicBookingConfig,
  invalidateBookingConfigCache,
  sanitizeConfigUpdate
} = require('../../utils/bookingConfig');

exports.getConfig = async (req, res) => {
  try {
    res.status(200).json({ success: true, config: await getBookingConfig() });
  } catch (error) {
    console.error('Get booking config error:', error);
    res.status(500).json({ success: false, message: 'Failed to load booking configuration' });
  }
};

exports.updateConfig = async (req, res) => {
  try {
    const { updates, errors } = sanitizeConfigUpdate(req.body || {});
    if (errors.length) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid settings were provided' });
    }

    // The smart strategy divides by the weight total, so all four cannot be 0.
    const current = await getBookingConfig();
    const merged = { ...current, ...updates };
    if (merged.assignmentStrategy === 'smart') {
      const total = merged.assignmentDistanceWeight + merged.assignmentRatingWeight
        + merged.assignmentAcceptanceWeight + merged.assignmentCompletionWeight;
      if (total <= 0) {
        return res.status(400).json({ success: false, message: 'At least one assignment weight must be above zero' });
      }
    }

    // A percentage fee cannot be more than 100%.
    if (merged.userLateCancelFeeType === 'percentage' && merged.userLateCancelFeeValue > 100) {
      return res.status(400).json({ success: false, message: 'The customer cancellation fee cannot be more than 100% of the booking amount' });
    }
    if (merged.workerLateCancelPenaltyType === 'percentage' && merged.workerLateCancelPenaltyValue > 100) {
      return res.status(400).json({ success: false, message: 'The professional cancellation penalty cannot be more than 100% of the booking amount' });
    }

    let settings = await Settings.findOne({ type: 'global' });
    if (!settings) settings = new Settings({ type: 'global' });
    Object.assign(settings, updates);
    await settings.save();

    invalidateBookingConfigCache();

    // Open apps pick up the change without a reload.
    try {
      const { getIO } = require('../../sockets');
      getIO().emit('booking_config_updated', await getPublicBookingConfig());
    } catch (_) {
      // Best effort.
    }

    console.log(`[BookingConfig] Updated by admin ${req.user?.id}: ${Object.keys(updates).join(', ')}`);
    res.status(200).json({ success: true, message: 'Booking configuration saved', config: await getBookingConfig() });
  } catch (error) {
    console.error('Update booking config error:', error);
    res.status(500).json({ success: false, message: 'Failed to save booking configuration' });
  }
};
