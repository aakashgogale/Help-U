import React from 'react';

// Up to this many options render as tap chips; longer lists use a dropdown
const CHIP_LIMIT = 4;

export const Chip = ({ active, disabled, onClick, children }) => (
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

/** One answer input for an admin-defined question (dropdown/chips, yes-no, text or number). */
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

export default FieldControl;
