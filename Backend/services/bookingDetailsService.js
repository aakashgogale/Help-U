const Cart = require('../models/Cart');
const { resolveFieldsForCategories, validateDetailAnswers, idOf } = require('../utils/detailFields');

/**
 * Answers to the admin's per-category questions ("Appliance brand", "Vehicle type"...) that a
 * customer saved on their cart items. At checkout each booked item names its cart item
 * (`cartItemId`); the answers are read from the cart, never from the request, checked against the
 * category's current questions, and copied onto the item so the booking keeps its own snapshot.
 */

const toAnswers = (details) =>
  Object.fromEntries((details || []).map((d) => [d.key, d.value]));

// Same shape the Booking model stores
const cleanDetails = (details) =>
  (Array.isArray(details) ? details : [])
    .filter((d) => d && d.key && d.value !== undefined && d.value !== null && String(d.value).trim() !== '')
    .map((d) => ({ key: String(d.key), label: String(d.label || d.key), value: String(d.value).slice(0, 200) }));

// The request's own `cartItemId` and `details` never travel further than this module
const withoutRequestFields = (item) => {
  const { cartItemId, details, ...rest } = item; // eslint-disable-line no-unused-vars
  return rest;
};

/**
 * Returns { bookedItems } with `details` set on each item, or { error, problems } when a required
 * answer is missing (or no longer valid).
 *
 * `trustPayload` is for the recurring runner, which replays details this module already vetted
 * when the plan was created; a customer's request never gets that.
 */
const resolveBookedItemDetails = async (userId, bookedItems, { trustPayload = false } = {}) => {
  if (!Array.isArray(bookedItems) || bookedItems.length === 0) return { bookedItems: bookedItems || [] };

  if (trustPayload) {
    return {
      bookedItems: bookedItems.map((item) => ({ ...withoutRequestFields(item), details: cleanDetails(item.details) }))
    };
  }

  const wantedIds = new Set(bookedItems.map((i) => i && i.cartItemId).filter(Boolean).map(String));
  if (wantedIds.size === 0) {
    return { bookedItems: bookedItems.map((item) => ({ ...withoutRequestFields(item), details: [] })) };
  }

  const cart = await Cart.findOne({ userId }).select('items').lean();
  const cartItems = new Map((cart?.items || []).map((ci) => [String(ci._id), ci]));
  const fieldsByCategory = await resolveFieldsForCategories(
    [...cartItems.values()].filter((ci) => wantedIds.has(String(ci._id))).map((ci) => idOf(ci.categoryId))
  );

  const problems = [];
  const resolved = bookedItems.map((item) => {
    const cartItem = item.cartItemId ? cartItems.get(String(item.cartItemId)) : null;
    if (!cartItem) return { ...withoutRequestFields(item), details: [] };

    const fields = fieldsByCategory.get(String(idOf(cartItem.categoryId))) || [];
    const { details, errors, missing } = validateDetailAnswers(fields, toAnswers(cartItem.details));

    if (missing.length || errors.length) {
      const labelOf = (key) => fields.find((f) => f.key === key)?.label || key;
      problems.push({
        cartItemId: String(cartItem._id),
        title: item.card?.title || cartItem.title || 'Service',
        missing: missing.map(labelOf),
        errors
      });
    }
    return { ...withoutRequestFields(item), details };
  });

  if (problems.length) {
    const first = problems[0];
    const message = first.missing.length
      ? `Please add the required details for ${first.title}: ${first.missing.join(', ')}.`
      : `Please update the details for ${first.title}. ${first.errors[0]}`;
    return { error: message, problems };
  }

  return { bookedItems: resolved };
};

module.exports = { resolveBookedItemDetails };
