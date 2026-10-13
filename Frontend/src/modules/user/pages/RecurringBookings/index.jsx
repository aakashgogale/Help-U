import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiRepeat, FiPause, FiPlay, FiXCircle, FiChevronDown, FiChevronUp, FiCalendar } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import bookingFeaturesService from '../../../../services/bookingFeaturesService';
import { ConfirmDialog } from '../../../../components/common';

const FREQUENCY = { weekly: 'Every week', biweekly: 'Every 2 weeks', monthly: 'Every month' };
const STATUS = {
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  paused: { label: 'Paused', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  completed: { label: 'Completed', className: 'bg-sky-50 text-sky-700 border-sky-200' }
};
const BOOKING_STATUS_LABEL = {
  searching: 'Finding professional', confirmed: 'Confirmed', accepted: 'Confirmed', assigned: 'Assigned',
  journey_started: 'On the way', visited: 'In progress', in_progress: 'In progress', work_done: 'Work done',
  completed: 'Completed', cancelled: 'Cancelled', rejected: 'Not available'
};

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '—');

/**
 * Customer's recurring booking plans: next visit, progress, and pause /
 * resume / cancel. Expanding a plan shows its visits.
 */
const RecurringBookings = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [details, setDetails] = useState({});
  const [busy, setBusy] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await bookingFeaturesService.listRecurring();
      if (res.success) setPlans(res.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load recurring bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!details[id]) {
      try {
        const res = await bookingFeaturesService.getRecurring(id);
        if (res.success) setDetails((prev) => ({ ...prev, [id]: res.data }));
      } catch {
        toast.error('Failed to load visits');
      }
    }
  };

  const act = async (id, action) => {
    setBusy(id);
    try {
      const res = await bookingFeaturesService.updateRecurring(id, action);
      if (res.success) {
        toast.success(res.message);
        setPlans((prev) => prev.map((p) => (p._id === id ? { ...p, ...res.data } : p)));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update the plan');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-gray-100" aria-label="Back">
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Recurring Bookings</h1>
      </header>

      <main className="px-4 py-4 space-y-3">
        {loading ? (
          [0, 1].map((i) => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse" />)
        ) : plans.length === 0 ? (
          <div className="text-center py-16 px-6">
            <FiRepeat className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">No recurring bookings yet</p>
            <p className="text-sm text-gray-400 mt-1">Choose "Repeat this booking" when you book a time slot to set one up.</p>
          </div>
        ) : (
          plans.map((plan) => {
            const meta = STATUS[plan.status] || STATUS.active;
            const detail = details[plan._id];
            const progress = Math.min(100, Math.round((plan.occurrencesCreated / plan.occurrencesPlanned) * 100));
            const canChange = ['active', 'paused'].includes(plan.status);

            return (
              <div key={plan._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 overflow-hidden">
                      {plan.categoryIcon ? <img src={plan.categoryIcon} alt="" className="w-7 h-7 object-contain" /> : <FiRepeat className="w-5 h-5 text-indigo-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900 truncate">{plan.serviceName}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${meta.className}`}>{meta.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{FREQUENCY[plan.frequency]} · {plan.scheduledTime}</p>
                      {plan.discountPercentage > 0 && (
                        <p className="text-xs font-semibold text-green-600 mt-0.5">{plan.discountPercentage}% off every visit</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{plan.occurrencesCreated} of {plan.occurrencesPlanned} visits booked</span>
                      {plan.status === 'active' && plan.nextOccurrenceAt && (
                        <span className="flex items-center gap-1 font-semibold text-gray-700">
                          <FiCalendar className="w-3 h-3" /> Next: {formatDate(plan.nextOccurrenceAt)}
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  {plan.lastError && plan.status !== 'cancelled' && (
                    <p className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5">{plan.lastError}</p>
                  )}

                  {canChange && (
                    <div className="mt-3 flex gap-2">
                      {plan.status === 'active' ? (
                        <button type="button" disabled={busy === plan._id} onClick={() => act(plan._id, 'pause')}
                          className="flex-1 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-700 flex items-center justify-center gap-1 disabled:opacity-50">
                          <FiPause className="w-3.5 h-3.5" /> Pause
                        </button>
                      ) : (
                        <button type="button" disabled={busy === plan._id} onClick={() => act(plan._id, 'resume')}
                          className="flex-1 py-2 rounded-xl text-xs font-bold border border-emerald-200 text-emerald-700 bg-emerald-50 flex items-center justify-center gap-1 disabled:opacity-50">
                          <FiPlay className="w-3.5 h-3.5" /> Resume
                        </button>
                      )}
                      <button type="button" disabled={busy === plan._id}
                        onClick={() => setConfirm({ id: plan._id })}
                        className="flex-1 py-2 rounded-xl text-xs font-bold border border-rose-100 text-rose-600 bg-rose-50 flex items-center justify-center gap-1 disabled:opacity-50">
                        <FiXCircle className="w-3.5 h-3.5" /> Cancel plan
                      </button>
                    </div>
                  )}
                </div>

                <button type="button" onClick={() => toggle(plan._id)}
                  className="w-full border-t border-gray-100 px-4 py-2.5 text-xs font-semibold text-gray-600 flex items-center justify-center gap-1">
                  {expanded === plan._id ? <>Hide visits <FiChevronUp className="w-3.5 h-3.5" /></> : <>View visits <FiChevronDown className="w-3.5 h-3.5" /></>}
                </button>

                {expanded === plan._id && (
                  <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3 space-y-2">
                    {!detail ? (
                      <div className="h-10 bg-white rounded-xl animate-pulse" />
                    ) : (detail.bookingIds || []).length === 0 ? (
                      <p className="text-xs text-gray-500">No visits yet.</p>
                    ) : (
                      [...detail.bookingIds].reverse().map((b) => (
                        <button key={b._id} type="button" onClick={() => navigate(`/user/booking/${b._id}`)}
                          className="w-full text-left bg-white rounded-xl border border-gray-100 px-3 py-2 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{formatDate(b.scheduledDate)}</p>
                            <p className="text-[11px] text-gray-500">#{b.bookingNumber}{b.vendorId ? ` · ${b.vendorId.businessName || b.vendorId.name}` : ''}</p>
                          </div>
                          <span className="text-[11px] font-semibold text-gray-600">{BOOKING_STATUS_LABEL[b.status] || b.status}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      <ConfirmDialog
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { const id = confirm?.id; setConfirm(null); if (id) act(id, 'cancel'); }}
        title="Cancel recurring booking?"
        message="No more visits will be booked. Visits that are already booked stay as they are."
        type="danger"
      />
    </div>
  );
};

export default RecurringBookings;
