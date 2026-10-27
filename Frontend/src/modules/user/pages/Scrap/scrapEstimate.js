// Display-only maths: the server prices the request again from the admin's rates

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const formatMoney = (n) => `₹${round2(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const unitLabel = (type) => (type.pricingMode === 'quote' ? 'piece' : type.unit);

/** What one selected type is worth, or null when it is quoted by the admin */
export const lineAmount = (type, quantity) => {
  if (type.pricingMode === 'quote') return null;
  const q = Number(quantity);
  return Number.isFinite(q) && q > 0 ? round2(type.ratePerUnit * q) : 0;
};

/** Sum of the priced lines and whether any selected type needs a quote */
export const basketTotals = (types, basket) => {
  let total = 0;
  let hasQuote = false;
  types.forEach((t) => {
    const row = basket[t.id];
    if (!row) return;
    const amount = lineAmount(t, row.quantity);
    if (amount === null) hasQuote = true;
    else total += amount;
  });
  return { total: round2(total), hasQuote };
};

/** First problem with the basket, as a sentence for the customer, or null when it is fine */
export const basketProblem = (types, basket) => {
  const chosen = types.filter((t) => basket[t.id]);
  if (chosen.length === 0) return 'Choose what you want to sell.';
  for (const t of chosen) {
    const row = basket[t.id];
    const q = Number(row.quantity);
    if (!Number.isFinite(q) || q <= 0) return `Enter how much ${t.name} you have.`;
    if (t.pricingMode !== 'quote' && q < (t.minQuantity || 0)) return `The minimum for ${t.name} is ${t.minQuantity} ${t.unit}.`;
    const missing = (t.detailFields || []).find((f) => f.required && !String(row.details?.[f.key] ?? '').trim());
    if (missing) return `Please answer "${missing.label}" for ${t.name}.`;
  }
  return null;
};
