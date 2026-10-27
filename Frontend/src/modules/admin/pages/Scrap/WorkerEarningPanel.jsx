import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiLoader, FiSave } from 'react-icons/fi';
import { bookingFeaturesAdminService } from '../../services/bookingFeaturesAdminService';

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

const money = (n) => `₹${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN')}`;

/**
 * What the professional earns for completing a scrap pickup. Off by default; when on, the earning is
 * added to their wallet once the customer has been paid. Saved together with Booking Configuration.
 */
const WorkerEarningPanel = () => {
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    bookingFeaturesAdminService.getConfig()
      .then((res) => {
        if (!active || !res.success) return;
        const c = res.config;
        const next = {
          enabled: !!c.scrapWorkerPayoutEnabled,
          type: c.scrapWorkerPayoutType || 'fixed',
          value: c.scrapWorkerPayoutValue ?? 0,
          max: c.scrapWorkerPayoutMax ?? 0
        };
        setSaved(next);
        setForm(next);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (!form) return null;

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    if (form.enabled && !(Number(form.value) > 0)) return toast.error('Enter the amount or percentage, or switch it off');
    setSaving(true);
    try {
      const res = await bookingFeaturesAdminService.updateConfig({
        scrapWorkerPayoutEnabled: form.enabled,
        scrapWorkerPayoutType: form.type,
        scrapWorkerPayoutValue: Number(form.value) || 0,
        scrapWorkerPayoutMax: Number(form.max) || 0
      });
      if (res.success) {
        toast.success('Saved');
        setSaved(form);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const example = form.type === 'percentage'
    ? Math.min(((Number(form.value) || 0) * 1000) / 100, Number(form.max) > 0 ? Number(form.max) : Infinity)
    : Number(form.value) || 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">Pay the professional for scrap pickups</p>
          <p className="text-xs text-gray-500">
            Off: the professional earns nothing for a pickup. On: the amount below is added to their wallet earnings once the customer has been paid.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={form.enabled}
          aria-label="Pay the professional for scrap pickups"
          onClick={() => set({ enabled: !form.enabled })}
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${form.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${form.enabled ? 'left-[18px]' : 'left-0.5'}`} />
        </button>
      </div>

      {form.enabled && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">Paid as</label>
            <select className={inputClass} value={form.type} onChange={(e) => set({ type: e.target.value })}>
              <option value="fixed">A fixed amount per pickup (₹)</option>
              <option value="percentage">A share of the scrap amount (%)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">{form.type === 'percentage' ? 'Share (%)' : 'Amount (₹)'}</label>
            <input type="number" min="0" max={form.type === 'percentage' ? 100 : undefined} step="0.5" className={inputClass} value={form.value} onChange={(e) => set({ value: e.target.value })} />
          </div>
          {form.type === 'percentage' && (
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700">Most per pickup (₹)</label>
              <input type="number" min="0" className={inputClass} value={form.max} onChange={(e) => set({ max: e.target.value })} />
              <p className="mt-1 text-[11px] text-gray-500">0 means no limit.</p>
            </div>
          )}
          <p className="rounded bg-gray-50 px-3 py-2 text-xs text-gray-700 sm:col-span-3">
            {form.type === 'percentage'
              ? `Example: on a ₹1,000 pickup the professional earns ${money(example)}.`
              : `The professional earns ${money(example)} for every completed pickup.`}
            {' '}This comes from Help U’s side; the customer’s payment is not reduced.
          </p>
        </div>
      )}

      {dirty && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <FiLoader className="animate-spin" /> : <FiSave />} Save
          </button>
        </div>
      )}
    </div>
  );
};

export default WorkerEarningPanel;
