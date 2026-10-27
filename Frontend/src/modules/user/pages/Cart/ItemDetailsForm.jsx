import React, { useMemo, useState } from 'react';
import { FiChevronDown, FiCheck } from 'react-icons/fi';

// Up to this many options render as tap chips; longer lists use a dropdown
const CHIP_LIMIT = 4;

const toAnswers = (details) =>
  Object.fromEntries((details || []).map((d) => [d.key, d.value]));

const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';

const Chip = ({ active, disabled, onClick, children }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`h-9 px-3.5 rounded-full border text-[13px] font-semibold transition-colors disabled:opacity-50 ${
      active
        ? 'border-accent bg-accent-soft text-accent'
        : 'border-gray-200 bg-white text-ink hover:border-gray-300'
    }`}
  >
    {children}
  </button>
);

const FieldControl = ({ field, value, disabled, onChange }) => {
  if (field.type === 'select') {
    const options = field.options || [];
    if (options.length <= CHIP_LIMIT) {
      return (
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => (
            <Chip key={opt} active={value === opt} disabled={disabled} onClick={() => onChange(value === opt ? '' : opt)}>
              {opt}
            </Chip>
          ))}
        </div>
      );
    }
    return (
      <select
        value={value || ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-[14px] text-ink"
      >
        <option value="">Select</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === 'boolean') {
    return (
      <div className="flex gap-2">
        {['Yes', 'No'].map((opt) => (
          <Chip key={opt} active={value === opt} disabled={disabled} onClick={() => onChange(value === opt ? '' : opt)}>
            {opt}
          </Chip>
        ))}
      </div>
    );
  }

  return (
    <input
      type={field.type === 'number' ? 'number' : 'text'}
      inputMode={field.type === 'number' ? 'decimal' : undefined}
      value={value || ''}
      disabled={disabled}
      maxLength={field.type === 'text' ? 200 : undefined}
      placeholder={field.placeholder || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-[14px] text-ink placeholder:text-gray-400"
    />
  );
};

/**
 * "Details needed" card for one cart item: the questions the admin set for its category.
 * Remount it (via `key`) whenever the saved answers change so the draft resets to them.
 */
const ItemDetailsForm = ({ item, busy, onSave }) => {
  const fields = item.detailFields || [];
  const saved = useMemo(() => toAnswers(item.details), [item.details]);
  const missing = item.missingDetailKeys || [];
  const hasMissing = missing.length > 0;

  const [draft, setDraft] = useState(saved);
  const [open, setOpen] = useState(hasMissing);

  if (!fields.length) return null;

  const dirty = fields.some((f) => (draft[f.key] || '') !== (saved[f.key] || ''));
  const answeredCount = fields.filter((f) => !isBlank(saved[f.key])).length;
  const summary = fields
    .filter((f) => !isBlank(saved[f.key]))
    .map((f) => saved[f.key])
    .join(' · ');

  const status = hasMissing
    ? { text: 'Required', className: 'text-amber-700 bg-amber-50 border-amber-200/70' }
    : answeredCount > 0
      ? { text: 'Added', className: 'text-emerald-700 bg-emerald-50 border-emerald-200/70' }
      : { text: 'Optional', className: 'text-gray-600 bg-gray-50 border-gray-200' };

  const handleSave = async () => {
    await onSave(item._id || item.id, draft);
  };

  return (
    <div id={`details-${item._id || item.id}`} className="mt-2.5 rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
      >
        <span className="text-[13px] font-semibold text-ink">Details</span>
        <span className={`text-[11px] font-semibold border rounded-full px-2 py-0.5 ${status.className}`}>
          {status.text}
        </span>
        {!open && summary && <span className="min-w-0 flex-1 truncate text-[12px] text-gray-500">{summary}</span>}
        <FiChevronDown
          className={`ml-auto w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-gray-100 pt-3">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-[13px] font-semibold text-ink mb-1.5">
                {field.label}
                {field.required && <span className="text-red-500"> *</span>}
              </label>
              <FieldControl
                field={field}
                value={draft[field.key]}
                disabled={busy}
                onChange={(v) => setDraft((prev) => ({ ...prev, [field.key]: v }))}
              />
              {field.helpText && <p className="mt-1 text-[11.5px] text-gray-500">{field.helpText}</p>}
            </div>
          ))}

          <button
            type="button"
            disabled={busy || !dirty}
            onClick={handleSave}
            className="w-full h-10 rounded-full bg-accent text-white text-[14px] font-semibold disabled:opacity-40 active:scale-[0.98] transition-all inline-flex items-center justify-center gap-1.5"
          >
            <FiCheck className="w-4 h-4" /> Save details
          </button>
        </div>
      )}
    </div>
  );
};

export default ItemDetailsForm;
