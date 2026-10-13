import React from 'react';
import { FiPlus, FiMinus, FiAlertTriangle, FiRepeat, FiFileText, FiCheck } from 'react-icons/fi';

const NAVY = '#163B66';
const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/**
 * Optional extras the customer can add to a service at checkout.
 * selected: { [addOnId]: quantity }
 */
export const AddOnsSelector = ({ addOns, selected, onChange }) => {
  if (!addOns?.length) return null;

  const setQty = (addOn, qty) => {
    const next = { ...selected };
    if (qty <= 0) delete next[addOn._id];
    else next[addOn._id] = Math.min(qty, addOn.maxQuantity || 1);
    onChange(next);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <h3 className="text-base font-bold text-black mb-1">Add-ons <span className="text-sm font-medium text-gray-400">(optional)</span></h3>
      <p className="text-xs text-gray-500 mb-3">Add extras to this booking. GST applies as on the service.</p>
      <div className="space-y-2">
        {addOns.map((addOn) => {
          const qty = selected[addOn._id] || 0;
          const multi = (addOn.maxQuantity || 1) > 1;
          return (
            <div key={addOn._id} className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${qty ? 'border-slate-300 bg-slate-50' : 'border-gray-200'}`}>
              {addOn.imageUrl && <img src={addOn.imageUrl} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{addOn.title}</p>
                {addOn.description && <p className="text-xs text-gray-500 line-clamp-2">{addOn.description}</p>}
                <p className="text-sm font-bold text-gray-900 mt-0.5">{money(addOn.price)}{multi ? <span className="text-xs font-medium text-gray-500"> each</span> : null}</p>
              </div>
              {qty > 0 && multi ? (
                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5 shrink-0">
                  <button type="button" onClick={() => setQty(addOn, qty - 1)} className="p-1.5" aria-label={`Fewer ${addOn.title}`}>
                    <FiMinus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-5 text-center text-sm font-bold">{qty}</span>
                  <button type="button" onClick={() => setQty(addOn, qty + 1)} disabled={qty >= addOn.maxQuantity} className="p-1.5 disabled:opacity-30" aria-label={`More ${addOn.title}`}>
                    <FiPlus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setQty(addOn, qty ? 0 : 1)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1 ${qty ? 'text-white border-transparent' : 'text-gray-800 border-gray-300 bg-white'}`}
                  style={qty ? { backgroundColor: NAVY } : undefined}
                >
                  {qty ? <><FiCheck className="w-3.5 h-3.5" /> Added</> : <><FiPlus className="w-3.5 h-3.5" /> Add</>}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Emergency booking toggle. Turning it on also switches the booking to instant.
 */
export const EmergencyOption = ({ emergency, enabled, onToggle, surchargeAmount }) => {
  if (!emergency?.available) return null;
  return (
    <button
      type="button"
      onClick={() => onToggle(!enabled)}
      className={`w-full text-left rounded-lg border p-4 mb-4 flex items-start gap-3 transition-colors ${enabled ? 'border-rose-300 bg-rose-50' : 'border-gray-200 bg-white'}`}
      aria-pressed={enabled}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${enabled ? 'bg-rose-500' : 'bg-rose-50'}`}>
        <FiAlertTriangle className={`w-5 h-5 ${enabled ? 'text-white' : 'text-rose-500'}`} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-gray-900">Emergency service</p>
        <p className="text-xs text-gray-600 mt-0.5">
          Priority dispatch to more nearby professionals for urgent problems.
          {surchargeAmount > 0 && <> Extra <span className="font-bold">{money(surchargeAmount)}</span> + GST.</>}
        </p>
      </div>
      <span className={`w-11 h-6 rounded-full p-0.5 flex items-center transition-colors shrink-0 ${enabled ? 'bg-rose-500 justify-end' : 'bg-gray-300 justify-start'}`}>
        <span className="w-5 h-5 rounded-full bg-white shadow" />
      </span>
    </button>
  );
};

/**
 * Instructions for the professional.
 */
export const BookingNotes = ({ value, onChange, maxLength = 500 }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
    <label htmlFor="booking-notes" className="text-base font-bold text-black flex items-center gap-2 mb-1">
      <FiFileText className="w-4 h-4 text-gray-500" />
      Instructions for the professional <span className="text-sm font-medium text-gray-400">(optional)</span>
    </label>
    <textarea
      id="booking-notes"
      value={value}
      onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
      rows={3}
      placeholder="E.g. gate code, parking, which room, what exactly is wrong"
      className="w-full mt-2 p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
    />
    <p className="text-[10px] text-gray-400 text-right">{value.length}/{maxLength}</p>
  </div>
);

const FREQUENCY_LABELS = { weekly: 'Every week', biweekly: 'Every 2 weeks', monthly: 'Every month' };

/**
 * Repeat this booking on a schedule. Only offered for slot (scheduled) bookings.
 * value: { frequency: '' | 'weekly' | 'biweekly' | 'monthly', occurrences }
 */
export const RecurringOption = ({ config, value, onChange }) => {
  if (!config?.isRecurringEnabled || !config.recurringFrequencies?.length) return null;
  const max = config.recurringMaxOccurrences || 12;
  const options = ['', ...config.recurringFrequencies];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <FiRepeat className="w-4 h-4 text-gray-500" />
        <h3 className="text-base font-bold text-black">Repeat this booking</h3>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        We'll book each visit for the same time slot automatically. Pay after each service.
        {config.recurringDiscountPercentage > 0 && <span className="font-bold text-green-600"> Save {config.recurringDiscountPercentage}% on every visit.</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((f) => {
          const active = (value.frequency || '') === f;
          return (
            <button
              type="button"
              key={f || 'once'}
              onClick={() => onChange({ frequency: f, occurrences: value.occurrences || 4 })}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${active ? 'text-white border-transparent' : 'bg-white text-gray-700 border-gray-200'}`}
              style={active ? { backgroundColor: NAVY } : undefined}
            >
              {f ? FREQUENCY_LABELS[f] : 'Just once'}
            </button>
          );
        })}
      </div>
      {value.frequency && (
        <div className="mt-3 flex items-center justify-between bg-gray-50 rounded-xl p-3">
          <span className="text-sm text-gray-700">Number of visits</span>
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
            <button type="button" onClick={() => onChange({ ...value, occurrences: Math.max(2, value.occurrences - 1) })} className="p-1.5" aria-label="Fewer visits">
              <FiMinus className="w-3.5 h-3.5" />
            </button>
            <span className="w-6 text-center text-sm font-bold">{value.occurrences}</span>
            <button type="button" onClick={() => onChange({ ...value, occurrences: Math.min(max, value.occurrences + 1) })} className="p-1.5" aria-label="More visits">
              <FiPlus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
