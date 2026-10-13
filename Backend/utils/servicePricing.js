/**
 * Service Pricing
 *
 * Resolves a service's pricing model into what the catalog shows and what
 * checkout actually charges. Kept as pure functions (no DB access) so the
 * same logic runs in the catalog listing, the checkout screen's preview, and
 * server-side booking creation without drifting apart.
 */

const PRICING_TYPES = ['fixed', 'hourly', 'starting_from', 'inspection_fee', 'quote_required'];

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Label + price shown on a service/catalog card. Never used for billing.
 */
const getDisplayPricing = (service) => {
  const type = service.pricingType || 'fixed';
  const base = Number(service.basePrice) || 0;

  switch (type) {
    case 'hourly': {
      const rate = Number(service.hourlyRate) || base;
      return { pricingType: type, label: `₹${rate}/hr`, amount: rate, bookable: true };
    }
    case 'starting_from':
      return { pricingType: type, label: `Starting from ₹${base}`, amount: base, bookable: true };
    case 'inspection_fee': {
      const fee = Number(service.inspectionFee) || 0;
      return { pricingType: type, label: `₹${fee} inspection visit`, amount: fee, bookable: true };
    }
    case 'quote_required':
      return {
        pricingType: type,
        label: service.quoteContactNote || 'Get a custom quote',
        amount: null,
        bookable: false
      };
    case 'fixed':
    default:
      return { pricingType: 'fixed', label: `₹${base}`, amount: base, bookable: true };
  }
};

/**
 * The service-base amount checkout should charge (before GST, add-ons,
 * emergency surcharge, discounts — same units as basePrice elsewhere in the
 * booking flow).
 *
 * options.hours: customer-selected duration, only meaningful for 'hourly'.
 * Returns { error } when the service cannot be booked this way (quote_required,
 * or an hours value outside the service's configured range).
 */
const resolveCheckoutAmount = (service, options = {}) => {
  const type = service.pricingType || 'fixed';
  const base = Number(service.basePrice) || 0;

  if (type === 'quote_required') {
    return { error: 'This service requires a custom quote and cannot be booked online. Please contact support.' };
  }

  if (type === 'hourly') {
    const minHours = Number(service.minHours) || 1;
    const maxHours = Number(service.maxHours) || 8;
    const rate = Number(service.hourlyRate) || base;
    let hours = Number(options.hours) || minHours;
    if (!Number.isFinite(hours) || hours < minHours || hours > maxHours) {
      return { error: `Please choose between ${minHours} and ${maxHours} hours for this service.` };
    }
    hours = Math.round(hours * 4) / 4; // Quarter-hour precision.
    return { amount: round2(rate * hours), hours, rateApplied: rate };
  }

  if (type === 'inspection_fee') {
    const fee = Number(service.inspectionFee) || 0;
    return { amount: round2(fee), isInspectionOnly: true };
  }

  // 'fixed' and 'starting_from' both charge basePrice at booking time;
  // starting_from's "real" total is settled later via the worker bill, same
  // as any booking with worker-added services.
  return { amount: round2(base) };
};

/**
 * Validates the admin/worker-facing pricing fields for a service payload.
 * Returns { error } or {} (nothing to merge in beyond what the caller already
 * has — kept symmetric with the other functions here).
 */
const validatePricingFields = (body) => {
  const type = body.pricingType || 'fixed';
  if (!PRICING_TYPES.includes(type)) return { error: 'Invalid pricing type' };

  if (type === 'hourly') {
    const rate = body.hourlyRate !== undefined ? Number(body.hourlyRate) : Number(body.basePrice);
    if (!Number.isFinite(rate) || rate < 0) return { error: 'Hourly rate must be zero or more' };
    const minHours = body.minHours !== undefined ? Number(body.minHours) : 1;
    const maxHours = body.maxHours !== undefined ? Number(body.maxHours) : 8;
    if (!Number.isInteger(minHours) || minHours < 1) return { error: 'Minimum hours must be at least 1' };
    if (!Number.isInteger(maxHours) || maxHours < minHours) return { error: 'Maximum hours must be at least the minimum' };
  }
  if (type === 'inspection_fee') {
    const fee = body.inspectionFee !== undefined ? Number(body.inspectionFee) : NaN;
    if (!Number.isFinite(fee) || fee < 0) return { error: 'Inspection fee is required and must be zero or more' };
  }
  if (type === 'quote_required' && body.quoteContactNote !== undefined && String(body.quoteContactNote).length > 300) {
    return { error: 'Quote note is too long' };
  }
  return {};
};

module.exports = {
  PRICING_TYPES,
  getDisplayPricing,
  resolveCheckoutAmount,
  validatePricingFields
};
