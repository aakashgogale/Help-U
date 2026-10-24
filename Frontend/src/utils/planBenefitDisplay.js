import { configService } from '../services/configService';

// A booking paid by a plan stores tax 0 and visiting charge 0 (it is free to the customer), but the
// screens show what those lines would have cost. Those amounts follow the admin's GST rate and
// visiting charge instead of fixed numbers.
let cachedSettings = null;

export const withNotionalCharges = async (booking) => {
  if (!booking || booking.paymentMethod !== 'plan_benefit') return booking;

  if (!cachedSettings) {
    const res = await configService.getSettings();
    cachedSettings = res?.settings || {};
  }
  const gst = Number(cachedSettings.serviceGstPercentage ?? 0);
  const visit = Number(cachedSettings.visitedCharges ?? 0);

  const out = { ...booking };
  if (!out.tax) out.tax = Math.round(((out.basePrice || 0) * gst) ) / 100;
  if (!out.visitingCharges && !out.visitationFee) out.visitingCharges = visit;
  return out;
};
