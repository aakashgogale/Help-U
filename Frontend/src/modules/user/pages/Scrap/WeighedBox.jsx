import React, { useState } from 'react';
import { FiCheck, FiLoader } from 'react-icons/fi';

const money = (n) => `₹${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/**
 * Shown once the professional has weighed the scrap: the amount, how to be paid, and a way to
 * question the weight. Payment only happens when the customer confirms.
 */
const WeighedBox = ({ item, busy, cashAllowed, onConfirm, onDispute }) => {
  const [method, setMethod] = useState('wallet');
  const [disputing, setDisputing] = useState(false);
  const [reason, setReason] = useState('');

  return (
    <div className="rounded-2xl border border-accent/20 bg-accent-soft p-4">
      <p className="text-[13px] font-semibold text-accent">Your scrap was weighed</p>
      <p className="mt-0.5 text-[26px] font-bold leading-tight text-ink">{money(item.finalPrice)}</p>
      {item.adjustReason && <p className="mt-1 text-[12px] text-gray-600">Updated by our team: {item.adjustReason}</p>}
      {item.weighNote && <p className="mt-1 text-[12px] text-gray-600">Note from the professional: {item.weighNote}</p>}

      <fieldset className="mt-3">
        <legend className="mb-1.5 text-[12px] font-semibold text-gray-600">How would you like to be paid?</legend>
        <div className="space-y-2">
          <label className={`flex items-center gap-3 rounded-xl border bg-white px-3.5 py-3 ${method === 'wallet' ? 'border-accent' : 'border-gray-200'}`}>
            <input type="radio" name={`payout-${item._id}`} checked={method === 'wallet'} onChange={() => setMethod('wallet')} className="accent-[#0F7457]" />
            <span className="text-[14px] font-semibold text-ink">Help U wallet<span className="block text-[12px] font-normal text-gray-500">Added right away</span></span>
          </label>
          {cashAllowed && (
            <label className={`flex items-center gap-3 rounded-xl border bg-white px-3.5 py-3 ${method === 'cash' ? 'border-accent' : 'border-gray-200'}`}>
              <input type="radio" name={`payout-${item._id}`} checked={method === 'cash'} onChange={() => setMethod('cash')} className="accent-[#0F7457]" />
              <span className="text-[14px] font-semibold text-ink">Cash from the professional<span className="block text-[12px] font-normal text-gray-500">Collect it now, before they leave</span></span>
            </label>
          )}
        </div>
      </fieldset>

      <button
        type="button"
        disabled={busy}
        onClick={() => onConfirm(method)}
        className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-[15px] font-semibold text-white active:scale-[0.99] disabled:opacity-50"
      >
        {busy ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiCheck className="h-4 w-4" />}
        Confirm and get {money(item.finalPrice)}
      </button>

      {!disputing ? (
        <button type="button" onClick={() => setDisputing(true)} className="mt-2 w-full py-2 text-[13px] font-semibold text-gray-600">
          The weight looks wrong
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <textarea
            rows={2}
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What looks wrong? e.g. I had about 5 kg, not 3"
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[14px] text-ink focus:border-accent/40 focus:outline-none"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setDisputing(false)} className="h-10 flex-1 rounded-full border border-gray-200 bg-white text-[13px] font-semibold text-gray-600">Cancel</button>
            <button
              type="button"
              disabled={busy || !reason.trim()}
              onClick={() => onDispute(reason.trim())}
              className="h-10 flex-1 rounded-full bg-ink text-[13px] font-semibold text-white disabled:opacity-40"
            >
              Send to our team
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeighedBox;
