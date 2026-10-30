import { useEffect, useState } from 'react';
import { getPartnerRegistrationFields } from '../services/authService';

// What the partner forms looked like before the admin could configure them; used until the admin's fields load
export const CORE_DEFAULTS = {
  name: { label: 'Full Name', placeholder: 'Organization or Person name', required: true, order: 1 },
  email: { label: 'Email Address', placeholder: 'worker@example.com', required: true, order: 2 },
  phone: { label: 'Phone Number', placeholder: '9876543210', required: true, order: 3 },
  aadhar_number: { label: 'Aadhar Number', placeholder: '1234 5678 9012', required: true, order: 4 },
  pan_number: { label: 'PAN Number', placeholder: 'ABCDE1234F', required: true, order: 5 },
  referral_code: { label: 'Referral Code', placeholder: 'e.g. HOMV-A4B7', required: false, order: 6, helpText: 'Only if you were referred by a worker' },
  service_categories: { label: 'Services & Categories', placeholder: 'Select services & categories', required: true, order: 7 },
  aadhar_front: { label: 'Aadhar Front', required: true, order: 1 },
  aadhar_back: { label: 'Aadhar Back', required: true, order: 2 },
  pan_document: { label: 'PAN Card', required: true, order: 3 }
};
export const LOCKED_CORE = ['name', 'email', 'phone'];

// The admin's settings for every core field: { active, required, label, placeholder, helpText, order }
export const buildCoreConfig = (fields = []) => {
  const byKey = new Map(fields.filter(f => f.isCore).map(f => [f.fieldKey, f]));
  const result = {};
  Object.entries(CORE_DEFAULTS).forEach(([key, def]) => {
    const f = byKey.get(key);
    const locked = LOCKED_CORE.includes(key);
    result[key] = {
      active: locked || !f || f.isActive !== false,
      required: locked || (f ? Boolean(f.isRequired) : def.required),
      label: f?.label || def.label,
      placeholder: f ? (f.placeholder || '') : (def.placeholder || ''),
      helpText: f ? (f.helpText || '') : (def.helpText || ''),
      order: f?.order ?? def.order
    };
  });
  return result;
};

// Screens opened one after another share a single request
let cached = { at: 0, promise: null };
const CACHE_MS = 30 * 1000;

export const loadRegistrationFields = () => {
  if (!cached.promise || Date.now() - cached.at > CACHE_MS) {
    cached = {
      at: Date.now(),
      promise: getPartnerRegistrationFields()
        .then(res => (res && res.success && Array.isArray(res.fields) ? res.fields : []))
        .catch(() => [])
    };
  }
  return cached.promise;
};

// Admin's registration settings for screens that show the partner's own details
export const useRegistrationConfig = () => {
  const [fields, setFields] = useState([]);

  useEffect(() => {
    let active = true;
    loadRegistrationFields().then(list => { if (active) setFields(list); });
    return () => { active = false; };
  }, []);

  return {
    fields,
    core: buildCoreConfig(fields),
    // Admin's own (non-core) fields by key, for showing a stored answer under its current label
    labelOf: (fieldKey) => fields.find(f => f.fieldKey === fieldKey)?.label || fieldKey.replace(/_/g, ' ')
  };
};
