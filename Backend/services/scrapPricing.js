const mongoose = require('mongoose');
const ScrapType = require('../models/ScrapType');
const { validateDetailAnswers } = require('../utils/detailFields');

const MAX_ITEMS = 20;
const MAX_QUANTITY = 100000;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const formatQuantity = (item) => `${item.quantity} ${item.unit === 'kg' ? 'kg' : (item.quantity === 1 ? 'piece' : 'pieces')}`;

/** "Iron 5 kg, Aluminium 3 kg" (kept short: first three, then "+N more") */
const summarise = (items) => {
  const parts = items.map((i) => `${i.name} ${formatQuantity(i)}`);
  return parts.length > 3 ? `${parts.slice(0, 3).join(', ')} +${parts.length - 3} more` : parts.join(', ');
};

/**
 * Prices what a customer wants to sell from the ADMIN's current scrap types. Names, units and
 * rates always come from the database, never from the request, and each rate is copied onto the
 * item so a later change does not alter it.
 *   rawItems: [{ typeId, quantity, details: { [key]: value } }]
 * Returns { items, estimatedTotal, hasQuoteItems, requiresPhoto } or { error }.
 */
const priceScrapItems = async (rawItems) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return { error: 'Choose what you want to sell.' };
  if (rawItems.length > MAX_ITEMS) return { error: `You can sell up to ${MAX_ITEMS} kinds of scrap in one pickup.` };

  const ids = rawItems.map((r) => String(r?.typeId || ''));
  if (ids.some((id) => !mongoose.isValidObjectId(id))) return { error: 'One of the scrap types is not valid.' };
  if (new Set(ids).size !== ids.length) return { error: 'Each kind of scrap can be added once. Combine the weights instead.' };

  const types = await ScrapType.find({ _id: { $in: ids }, isActive: true }).lean();
  const byId = new Map(types.map((t) => [String(t._id), t]));

  const items = [];
  let estimatedTotal = 0;
  let hasQuoteItems = false;
  let requiresPhoto = false;

  for (const raw of rawItems) {
    const type = byId.get(String(raw.typeId));
    if (!type) return { error: 'One of the scrap types is no longer available. Please refresh and try again.' };

    const isQuote = type.pricingMode === 'quote';
    const unit = isQuote ? 'piece' : type.unit;
    let quantity = Number(raw.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) return { error: `Enter how much ${type.name} you have.` };
    quantity = unit === 'piece' ? Math.round(quantity) : round2(quantity);
    if (quantity > MAX_QUANTITY) return { error: `That is too much ${type.name} for one pickup.` };
    if (!isQuote && quantity < (type.minQuantity || 0)) {
      return { error: `The minimum for ${type.name} is ${type.minQuantity} ${unit}.` };
    }

    const answers = validateDetailAnswers(type.detailFields, raw.details);
    if (answers.errors.length) return { error: answers.errors[0] };
    if (answers.missing.length) {
      const label = type.detailFields.find((f) => f.key === answers.missing[0])?.label || 'a detail';
      return { error: `Please answer "${label}" for ${type.name}.` };
    }

    const estimatedAmount = isQuote ? 0 : round2(type.ratePerUnit * quantity);
    if (isQuote) hasQuoteItems = true;
    if (type.requiresPhoto) requiresPhoto = true;
    estimatedTotal += estimatedAmount;

    items.push({
      scrapTypeId: type._id,
      name: type.name,
      group: type.group || '',
      pricingMode: type.pricingMode,
      unit,
      rate: isQuote ? 0 : type.ratePerUnit,
      quantity,
      estimatedAmount,
      details: answers.details
    });
  }

  return { items, estimatedTotal: round2(estimatedTotal), hasQuoteItems, requiresPhoto };
};

module.exports = { priceScrapItems, summarise };
