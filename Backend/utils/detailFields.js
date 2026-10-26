const mongoose = require('mongoose');

/**
 * Booking detail fields: questions the admin attaches to a category (or, later, a single
 * service) that the customer answers in the cart, e.g. "Appliance brand" or "Vehicle type".
 * Answers are keyed by `key`, which never changes after creation, so renaming a label does
 * not orphan answers already saved on carts and bookings.
 */

const FIELD_TYPES = ['select', 'text', 'number', 'boolean'];
const MAX_FIELDS = 10;
const MAX_OPTIONS = 30;

const detailFieldSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true },
  label: { type: String, required: true, trim: true, maxlength: 60 },
  type: { type: String, enum: FIELD_TYPES, default: 'text' },
  options: { type: [String], default: [] },
  required: { type: Boolean, default: false },
  placeholder: { type: String, default: '', trim: true, maxlength: 80 },
  helpText: { type: String, default: '', trim: true, maxlength: 120 }
}, { _id: false });

const slugKey = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);

/**
 * Validate and normalise admin input. Returns { fields } or { error }.
 * Unknown properties are dropped; keys are kept when valid, otherwise derived from the
 * label, and always made unique.
 */
const sanitizeDetailFields = (input) => {
  if (input === undefined || input === null) return { fields: [] };
  if (!Array.isArray(input)) return { error: 'Detail fields must be a list.' };
  if (input.length > MAX_FIELDS) return { error: `You can add at most ${MAX_FIELDS} detail fields.` };

  const fields = [];
  const usedKeys = new Set();

  for (const raw of input) {
    const label = String(raw?.label || '').trim().slice(0, 60);
    if (!label) return { error: 'Every detail field needs a label.' };

    const type = FIELD_TYPES.includes(raw?.type) ? raw.type : 'text';

    let key = slugKey(raw?.key) || slugKey(label) || 'field';
    const base = key;
    let n = 2;
    while (usedKeys.has(key)) key = `${base}_${n++}`;
    usedKeys.add(key);

    let options = [];
    if (type === 'select') {
      const seen = new Set();
      options = (Array.isArray(raw?.options) ? raw.options : [])
        .map((o) => String(o || '').trim().slice(0, 40))
        .filter((o) => o && !seen.has(o.toLowerCase()) && seen.add(o.toLowerCase()));
      if (options.length < 2) return { error: `"${label}" is a dropdown and needs at least 2 options.` };
      if (options.length > MAX_OPTIONS) return { error: `"${label}" can have at most ${MAX_OPTIONS} options.` };
    }

    fields.push({
      key,
      label,
      type,
      options,
      required: raw?.required === true,
      placeholder: String(raw?.placeholder || '').trim().slice(0, 80),
      helpText: String(raw?.helpText || '').trim().slice(0, 120)
    });
  }

  return { fields };
};

module.exports = { FIELD_TYPES, MAX_FIELDS, detailFieldSchema, sanitizeDetailFields };
