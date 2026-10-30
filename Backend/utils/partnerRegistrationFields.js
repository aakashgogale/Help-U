const PartnerRegistrationField = require('../models/PartnerRegistrationField');

// The fixed parts of the partner signup form. They are stored next to the admin's own fields so the
// admin can rename, reorder, hide or make them optional. fieldKey is what the signup form and the
// register endpoint look them up by, so it never changes.
const SYSTEM_FIELDS = [
  { fieldKey: 'name', label: 'Full Name', type: 'text', section: 'profile', placeholder: 'Organization or Person name', helpText: '', isRequired: true, order: 1 },
  { fieldKey: 'email', label: 'Email Address', type: 'text', section: 'profile', placeholder: 'worker@example.com', helpText: '', isRequired: true, order: 2 },
  { fieldKey: 'phone', label: 'Phone Number', type: 'text', section: 'profile', placeholder: '9876543210', helpText: '', isRequired: true, order: 3 },
  { fieldKey: 'aadhar_number', label: 'Aadhar Number', type: 'text', section: 'profile', placeholder: '1234 5678 9012', helpText: '', isRequired: true, order: 4 },
  { fieldKey: 'pan_number', label: 'PAN Number', type: 'text', section: 'profile', placeholder: 'ABCDE1234F', helpText: '', isRequired: true, order: 5 },
  { fieldKey: 'referral_code', label: 'Referral Code', type: 'text', section: 'profile', placeholder: 'e.g. HOMV-A4B7', helpText: 'Only if you were referred by a worker', isRequired: false, order: 6 },
  { fieldKey: 'service_categories', label: 'Services & Categories', type: 'services', section: 'profile', placeholder: 'Select services & categories', helpText: '', isRequired: true, order: 7 },
  { fieldKey: 'aadhar_front', label: 'Aadhar Front', type: 'document', section: 'documents', placeholder: '', helpText: '', isRequired: true, order: 1 },
  { fieldKey: 'aadhar_back', label: 'Aadhar Back', type: 'document', section: 'documents', placeholder: '', helpText: '', isRequired: true, order: 2 },
  { fieldKey: 'pan_document', label: 'PAN Card', type: 'document', section: 'documents', placeholder: '', helpText: '', isRequired: true, order: 3 }
];

const SYSTEM_KEYS = SYSTEM_FIELDS.map(f => f.fieldKey);

// Identity of the account: always on and mandatory (label, hint and order can still change)
const LOCKED_KEYS = ['name', 'email', 'phone'];

const isSystemKey = (fieldKey) => SYSTEM_KEYS.includes(fieldKey);
const isLockedKey = (fieldKey) => LOCKED_KEYS.includes(fieldKey);

// Adds any core field that is missing. Existing ones are left alone so the admin's edits stay.
const ensureSystemFields = async () => {
  const existing = await PartnerRegistrationField.find({ fieldKey: { $in: SYSTEM_KEYS } }).select('fieldKey').lean();
  const have = new Set(existing.map(f => f.fieldKey));
  const missing = SYSTEM_FIELDS.filter(f => !have.has(f.fieldKey));
  if (missing.length === 0) return;

  // Core fields take the first places of their section; the admin's own fields move down
  for (const section of ['profile', 'documents']) {
    const count = missing.filter(f => f.section === section).length;
    if (count > 0) {
      await PartnerRegistrationField.updateMany(
        { section, fieldKey: { $nin: SYSTEM_KEYS } },
        { $inc: { order: count } }
      );
    }
  }

  try {
    await PartnerRegistrationField.insertMany(
      missing.map(f => ({ ...f, isActive: true, isSystemDefault: true })),
      { ordered: false }
    );
  } catch (error) {
    // A parallel request created them first
    if (error.code !== 11000 && !error.writeErrors) throw error;
  }
};

// How the signup treats a core field: { active, required }. Falls back to the original form.
const getSystemRules = (fields) => {
  const byKey = new Map((fields || []).map(f => [f.fieldKey, f]));
  return (fieldKey) => {
    const field = byKey.get(fieldKey);
    const base = SYSTEM_FIELDS.find(f => f.fieldKey === fieldKey);
    if (isLockedKey(fieldKey)) return { active: true, required: true };
    if (!field) return { active: true, required: Boolean(base?.isRequired) };
    return { active: field.isActive !== false, required: Boolean(field.isRequired) };
  };
};

module.exports = {
  SYSTEM_FIELDS,
  SYSTEM_KEYS,
  LOCKED_KEYS,
  isSystemKey,
  isLockedKey,
  ensureSystemFields,
  getSystemRules
};
