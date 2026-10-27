import React, { useMemo } from 'react';
import { FiX, FiInfo } from 'react-icons/fi';
import { FaRecycle } from 'react-icons/fa';
import FieldControl from '../../../../components/common/DetailFieldControl';
import { formatMoney, lineAmount, unitLabel } from './scrapEstimate';

const inputClass = 'w-full h-11 rounded-xl bg-canvas border border-transparent px-3.5 text-[15px] text-ink placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-accent/40 focus:ring-2 focus:ring-accent/15';

const TypeTile = ({ type, selected, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-pressed={selected}
    className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-colors ${
      selected ? 'border-accent bg-accent-soft' : 'border-gray-100 bg-white hover:border-gray-200'
    }`}
  >
    {type.image ? (
      <img src={type.image} alt="" className="h-12 w-12 rounded-xl object-cover" loading="lazy" />
    ) : (
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-canvas text-accent"><FaRecycle className="h-5 w-5" /></span>
    )}
    <span className="text-[13px] font-semibold leading-tight text-ink">{type.name}</span>
    <span className={`text-[11px] font-semibold ${selected ? 'text-accent' : 'text-gray-500'}`}>
      {type.pricingMode === 'quote' ? 'Get a quote' : `${formatMoney(type.ratePerUnit)}/${type.unit}`}
    </span>
  </button>
);

/**
 * Pick what to sell (from the admin's scrap types), enter how much of each, answer that type's
 * questions, and see the estimate. `basket` is { [typeId]: { quantity, details } }.
 */
const ScrapBasket = ({ types, basket, onChange }) => {
  const groups = useMemo(() => {
    const map = new Map();
    types.forEach((t) => {
      const g = t.group || 'Other';
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(t);
    });
    return [...map.entries()];
  }, [types]);

  const chosen = types.filter((t) => basket[t.id]);

  const toggle = (type) => {
    const next = { ...basket };
    if (next[type.id]) delete next[type.id];
    else next[type.id] = { quantity: '', details: {} };
    onChange(next);
  };

  const update = (typeId, patch) => onChange({ ...basket, [typeId]: { ...basket[typeId], ...patch } });

  return (
    <div className="space-y-3">
      <section className="rounded-[20px] border border-gray-100 bg-white p-4">
        <h3 className="mb-3 text-[13px] font-semibold text-ink">What are you selling?</h3>
        <div className="space-y-4">
          {groups.map(([group, list]) => (
            <div key={group}>
              {groups.length > 1 && <p className="mb-2 text-[12px] font-bold uppercase tracking-wider text-gray-400">{group}</p>}
              <div className="grid grid-cols-3 gap-2.5">
                {list.map((t) => (
                  <TypeTile key={t.id} type={t} selected={!!basket[t.id]} onToggle={() => toggle(t)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {chosen.map((type) => {
        const row = basket[type.id];
        const amount = lineAmount(type, row.quantity);
        const unit = unitLabel(type);
        return (
          <section key={type.id} className="rounded-[20px] border border-gray-100 bg-white p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[15px] font-bold text-ink">{type.name}</h3>
                <p className="text-[12px] text-gray-500">
                  {type.pricingMode === 'quote'
                    ? 'We will quote a price after we see it'
                    : `${formatMoney(type.ratePerUnit)} per ${type.unit}${type.minQuantity > 1 ? ` · minimum ${type.minQuantity} ${type.unit}` : ''}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggle(type)}
                aria-label={`Remove ${type.name}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            {type.info && (
              <p className="mb-3 flex gap-2 rounded-xl bg-canvas px-3 py-2 text-[12px] leading-relaxed text-gray-600">
                <FiInfo className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" /> {type.info}
              </p>
            )}

            <label className="mb-1.5 block text-[13px] font-semibold text-ink" htmlFor={`qty-${type.id}`}>
              {type.pricingMode === 'quote' ? 'How many?' : `Approximate weight (${unit})`}
            </label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  id={`qty-${type.id}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step={unit === 'kg' ? '0.5' : '1'}
                  className={`${inputClass} pr-14`}
                  value={row.quantity}
                  onChange={(e) => update(type.id, { quantity: e.target.value })}
                  placeholder={unit === 'kg' ? 'e.g. 5' : 'e.g. 1'}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-gray-400">{unit}</span>
              </div>
              {amount !== null && (
                <div className="min-w-[88px] text-right">
                  <p className="text-[11px] text-gray-400">Estimate</p>
                  <p className="text-[16px] font-bold text-ink">{amount > 0 ? formatMoney(amount) : '—'}</p>
                </div>
              )}
            </div>

            {(type.detailFields || []).length > 0 && (
              <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                {type.detailFields.map((field) => (
                  <div key={field.key}>
                    <label className="mb-1.5 block text-[13px] font-semibold text-ink">
                      {field.label}{field.required && <span className="text-red-500"> *</span>}
                    </label>
                    <FieldControl
                      field={field}
                      value={row.details?.[field.key]}
                      onChange={(v) => update(type.id, { details: { ...row.details, [field.key]: v } })}
                    />
                    {field.helpText && <p className="mt-1 text-[11.5px] text-gray-500">{field.helpText}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

export default ScrapBasket;
