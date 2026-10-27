import React from 'react';

/**
 * The customer's answers to a service's questions as small tags ("Brand: Bajaj"). Used in the
 * booking pages of both apps. `details` is [{ key, label, value }]; renders nothing when empty.
 */
const DetailChips = ({ details, className = '', tone = 'light' }) => {
  const list = (details || []).filter((d) => d && String(d.value ?? '').trim() !== '');
  if (list.length === 0) return null;

  const chip = tone === 'dark'
    ? 'bg-white/10 border-white/20 text-white'
    : 'bg-white border-gray-200 text-gray-700';
  const label = tone === 'dark' ? 'text-white/70' : 'text-gray-500';

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {list.map((d) => (
        <span key={d.key} className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] ${chip}`}>
          <span className={label}>{d.label}:&nbsp;</span>
          <span className="font-semibold">{d.value}</span>
        </span>
      ))}
    </div>
  );
};

export default DetailChips;
