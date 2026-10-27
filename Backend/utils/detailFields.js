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

const MAX_TEXT_LENGTH = 200;

const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';

/**
 * The questions that apply to a category: its own, otherwise its parent's. Returns a Map of
 * String(categoryId) -> fields[] for every id asked about (empty array when none apply).
 */
const resolveFieldsForCategories = async (categoryIds) => {
  // Required lazily: the Category model also requires this file for its schema
  const Category = require('../models/Category');
  const ids = [...new Set((categoryIds || []).filter(Boolean).map(String))];
  const result = new Map(ids.map((id) => [id, []]));
  if (!ids.length) return result;

  const cats = await Category.find({ _id: { $in: ids } }).select('detailFields parentId').lean();
  const parentIds = cats.filter((c) => !(c.detailFields || []).length && c.parentId).map((c) => String(c.parentId));
  const parents = parentIds.length
    ? await Category.find({ _id: { $in: parentIds } }).select('detailFields').lean()
    : [];
  const parentFields = new Map(parents.map((p) => [String(p._id), p.detailFields || []]));

  for (const c of cats) {
    const own = c.detailFields || [];
    result.set(String(c._id), own.length ? own : (c.parentId ? parentFields.get(String(c.parentId)) || [] : []));
  }
  return result;
};

/**
 * Check a customer's answers against the fields. `answers` is { [key]: value }.
 * Returns { details, errors, missing }: `details` is the clean [{ key, label, value }] list in
 * field order (values stored as display strings), `missing` the keys of required fields still
 * unanswered. Unknown keys are ignored.
 */
const validateDetailAnswers = (fields, answers) => {
  const source = answers && typeof answers === 'object' ? answers : {};
  const details = [];
  const errors = [];
  const missing = [];

  for (const field of fields || []) {
    const raw = source[field.key];

    if (isBlank(raw)) {
      if (field.required) missing.push(field.key);
      continue;
    }

    let value;
    if (field.type === 'select') {
      value = String(raw).trim();
      if (!(field.options || []).includes(value)) {
        errors.push(`"${value}" is not an option for "${field.label}".`);
        continue;
      }
    } else if (field.type === 'number') {
      const n = Number(raw);
      if (!Number.isFinite(n)) {
        errors.push(`"${field.label}" must be a number.`);
        continue;
      }
      value = String(n);
    } else if (field.type === 'boolean') {
      const yes = raw === true || String(raw).toLowerCase() === 'yes' || String(raw).toLowerCase() === 'true';
      const no = raw === false || String(raw).toLowerCase() === 'no' || String(raw).toLowerCase() === 'false';
      if (!yes && !no) {
        errors.push(`"${field.label}" must be Yes or No.`);
        continue;
      }
      value = yes ? 'Yes' : 'No';
    } else {
      value = String(raw).trim().slice(0, MAX_TEXT_LENGTH);
    }

    details.push({ key: field.key, label: field.label, value });
  }

  return { details, errors, missing };
};

/** Required fields without a stored, non-empty answer. */
const missingRequiredKeys = (fields, details) => {
  const answered = new Set((details || []).filter((d) => !isBlank(d.value)).map((d) => d.key));
  return (fields || []).filter((f) => f.required && !answered.has(f.key)).map((f) => f.key);
};

const idOf = (ref) => (ref && ref._id ? ref._id : ref);

/**
 * Cart items as plain objects, each with the questions that apply to it (`detailFields`) and
 * which required ones are still unanswered (`missingDetailKeys`). Every cart response goes
 * through this, because the app replaces its whole cart with whatever a response returns.
 */
const enrichCartItems = async (items) => {
  const plain = (items || []).map((item) => (typeof item.toObject === 'function' ? item.toObject() : item));
  const fieldsByCategory = await resolveFieldsForCategories(plain.map((i) => idOf(i.categoryId)));
  return plain.map((item) => {
    const detailFields = fieldsByCategory.get(String(idOf(item.categoryId))) || [];
    return {
      ...item,
      detailFields,
      missingDetailKeys: missingRequiredKeys(detailFields, item.details)
    };
  });
};

module.exports = {
  FIELD_TYPES,
  MAX_FIELDS,
  detailFieldSchema,
  sanitizeDetailFields,
  resolveFieldsForCategories,
  validateDetailAnswers,
  missingRequiredKeys,
  enrichCartItems,
  idOf
};
