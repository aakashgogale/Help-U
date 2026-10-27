import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FiArrowLeft, FiMapPin, FiPhone, FiCalendar, FiCheckCircle, FiClock, FiAlertTriangle, FiLoader } from 'react-icons/fi';
import api from '../../../../services/api';

const money = (n) => `₹${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const TABS = [
  { key: 'active', label: 'To collect' },
  { key: 'done', label: 'Done' }
];

const formatWhen = (scrap) => {
  const d = scrap.pickupDate ? new Date(scrap.pickupDate) : null;
  if (!d || Number.isNaN(d.getTime())) return 'Time to be confirmed';
  const day = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  return scrap.pickupSlot ? `${day}, ${scrap.pickupSlot}` : day;
};

// What one line will be paid, from the weight entered (the server works it out again on submit)
const lineAmount = (item, qty) => {
  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 0) return 0;
  return item.pricingMode === 'quote' ? round2(item.quotedAmount || 0) : round2(item.rate * q);
};

const PickupCard = ({ scrap, onSaved }) => {
  const [open, setOpen] = useState(scrap.status === 'accepted');
  // Start from the customer's own estimate, or from what was weighed before
  const [weights, setWeights] = useState(() =>
    Object.fromEntries((scrap.items || []).map((i) => [i._id, String(i.actualQuantity ?? i.quantity ?? '')]))
  );
  const [note, setNote] = useState(scrap.weighNote || '');
  const [saving, setSaving] = useState(false);

  const total = useMemo(
    () => round2((scrap.items || []).reduce((sum, i) => sum + lineAmount(i, weights[i._id]), 0)),
    [scrap.items, weights]
  );

  const address = [scrap.address?.addressLine1, scrap.address?.addressLine2].filter(Boolean).join(', ');
  const mapsUrl = scrap.address?.lat != null && scrap.address?.lng != null
    ? `https://www.google.com/maps?q=${scrap.address.lat},${scrap.address.lng}`
    : address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
  const canWeigh = scrap.status === 'accepted' && (scrap.items || []).length > 0;

  const submit = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/scrap/worker/${scrap._id}/weigh`, {
        note,
        items: (scrap.items || []).map((i) => ({ itemId: i._id, actualQuantity: weights[i._id] === '' ? NaN : Number(weights[i._id]) }))
      });
      if (res.data.success) {
        toast.success('Weights sent to the customer');
        onSaved();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save the weights');
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full p-4 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold leading-snug text-slate-900">{scrap.title}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{scrap.userId?.name || 'Customer'}</p>
          </div>
          {scrap.status === 'accepted' && <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">To weigh</span>}
          {scrap.status === 'weighed' && <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">Customer confirming</span>}
          {scrap.status === 'completed' && <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">Done</span>}
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600"><FiCalendar className="h-3.5 w-3.5" /> {formatWhen(scrap)}</p>
        <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-500"><FiMapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span className="line-clamp-2">{address || 'Address not available'}</span></p>
      </button>

      {open && (
        <div className="space-y-3 border-t border-slate-100 p-4">
          <div className="flex gap-2">
            {scrap.userId?.phone && (
              <a href={`tel:${scrap.userId.phone}`} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-700">
                <FiPhone className="h-3.5 w-3.5" /> Call customer
              </a>
            )}
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-700">
                <FiMapPin className="h-3.5 w-3.5" /> Directions
              </a>
            )}
          </div>

          {scrap.status === 'accepted' && scrap.weightDispute?.reason && (
            <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <FiAlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              The customer questioned the weight: “{scrap.weightDispute.reason}”. Please weigh again.
            </p>
          )}

          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
            {(scrap.items || []).map((item) => {
              const unit = item.unit;
              return (
                <li key={item._id} className="p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900">{item.name}</span>
                    <span className="text-xs text-slate-500">Customer said {item.quantity} {unit}</span>
                  </div>
                  {item.details?.length > 0 && (
                    <p className="mt-0.5 text-[11px] text-slate-500">{item.details.map((d) => `${d.label}: ${d.value}`).join(' · ')}</p>
                  )}
                  {canWeigh ? (
                    <div className="mt-2 flex items-center gap-3">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step={unit === 'kg' ? '0.1' : '1'}
                          value={weights[item._id]}
                          onChange={(e) => setWeights((w) => ({ ...w, [item._id]: e.target.value }))}
                          aria-label={`Actual ${item.name} (${unit})`}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 pr-12 text-sm font-bold text-slate-900 focus:border-slate-400 focus:bg-white focus:outline-none"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">{unit}</span>
                      </div>
                      <div className="min-w-[84px] text-right">
                        <p className="text-sm font-bold text-slate-900">{money(lineAmount(item, weights[item._id]))}</p>
                        <p className="text-[10px] text-slate-400">{item.pricingMode === 'quote' ? 'agreed price' : `${money(item.rate)}/${unit}`}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs font-semibold text-slate-700">
                      {item.actualQuantity != null ? `Collected ${item.actualQuantity} ${unit} · ${money(item.finalAmount)}` : 'Not weighed yet'}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          {canWeigh ? (
            <>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
                placeholder="Note for the customer (optional)"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:border-slate-400 focus:bg-white focus:outline-none"
              />
              <div className="flex items-baseline justify-between px-1">
                <span className="text-xs font-semibold text-slate-500">Total to pay the customer</span>
                <span className="text-lg font-extrabold text-slate-900">{money(total)}</span>
              </div>
              <button
                type="button"
                onClick={submit}
                disabled={saving}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-bold text-white active:scale-[0.99] disabled:opacity-50"
              >
                {saving ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiCheckCircle className="h-4 w-4" />}
                Send weights to customer
              </button>
              <p className="text-center text-[11px] text-slate-400">The customer confirms the amount in their app and is paid.</p>
            </>
          ) : (
            <div className="flex items-baseline justify-between px-1">
              <span className="text-xs font-semibold text-slate-500">{scrap.status === 'completed' ? 'Paid to the customer' : 'Amount sent to the customer'}</span>
              <span className="text-lg font-extrabold text-slate-900">{money(scrap.finalPrice)}</span>
            </div>
          )}
          {scrap.status === 'completed' && scrap.payout?.method === 'cash' && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
              The customer chose cash. You paid {money(scrap.payout.amount)} in hand; Help U will reimburse you.
            </p>
          )}
        </div>
      )}
    </article>
  );
};

const ScrapPickups = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('active');
  const [items, setItems] = useState(null);

  const [version, setVersion] = useState(0); // bump to reload after a save

  useEffect(() => {
    let active = true;
    api.get('/scrap/worker/mine')
      .then((res) => { if (active) setItems(res.data.success ? res.data.data : []); })
      .catch(() => {
        if (!active) return;
        setItems([]);
        toast.error('Could not load your pickups');
      });
    return () => { active = false; };
  }, [version]);

  const shown = (items || []).filter((s) => (tab === 'done' ? s.status === 'completed' : s.status !== 'completed'));

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-gray-100" aria-label="Back"><FiArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold text-gray-900">Scrap pickups</h1>
        </div>
        <div className="flex gap-2 px-4 pb-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold ${tab === t.key ? 'border-slate-900 bg-slate-900 text-white' : 'border-gray-200 bg-white text-gray-600'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="space-y-3 px-4 py-4">
        {items === null ? (
          <div className="flex justify-center py-16"><FiLoader className="h-6 w-6 animate-spin text-slate-400" /></div>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <FiClock className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">{tab === 'done' ? 'No finished pickups yet' : 'No pickups to collect'}</p>
            <p className="mt-1 text-xs text-slate-400">Scrap pickups assigned to you appear here.</p>
          </div>
        ) : (
          shown.map((s) => <PickupCard key={`${s._id}-${s.status}-${s.updatedAt}`} scrap={s} onSaved={() => setVersion((v) => v + 1)} />)
        )}
      </main>
    </div>
  );
};

export default ScrapPickups;
