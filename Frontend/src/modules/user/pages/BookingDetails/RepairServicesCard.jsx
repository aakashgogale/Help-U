import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiTool, FiPlus, FiMinus, FiCheck, FiX, FiEdit3, FiInfo } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { bookingService } from '../../../../services/bookingService';

const OPEN_STATUSES = ['visited', 'in_progress', 'work_done'];
const MAX_QTY = 10;
const MAX_NOTE = 300;

const formatINR = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/**
 * After the professional inspects (e.g. a "Visit" booking), the customer picks
 * the repair services needed from the same brand's catalog or describes another
 * problem. The server prices them and adds them to the bill automatically.
 */
const RepairServicesCard = ({ booking, onSaved }) => {
  const bookingId = booking?._id || booking?.id;
  const status = (booking?.status || '').toLowerCase();
  const hasSelection = (booking?.customerAddedServices || []).length > 0;
  const visible = OPEN_STATUSES.includes(status) || hasSelection;

  const [data, setData] = useState(null); // { canEdit, reason, options, selected, estimate }
  const [sheetOpen, setSheetOpen] = useState(false);
  const [quantities, setQuantities] = useState({}); // serviceId -> qty
  const [otherOn, setOtherOn] = useState(false);
  const [otherNote, setOtherNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!bookingId) return;
    try {
      const res = await bookingService.getExtraServices(bookingId);
      if (res.success) setData(res);
    } catch {
      // Card simply stays hidden if options can't be loaded
    }
  }, [bookingId]);

  useEffect(() => {
    if (visible) load();
  }, [visible, status, booking?.vendorBillId, load]);

  // Lock page scroll while the picker is open
  useEffect(() => {
    if (!sheetOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [sheetOpen]);

  const openPicker = () => {
    const next = {};
    (data?.selected || []).filter(i => !i.isOther && i.serviceId).forEach(i => { next[String(i.serviceId)] = i.quantity; });
    const other = (data?.selected || []).find(i => i.isOther);
    setQuantities(next);
    setOtherOn(Boolean(other));
    setOtherNote(other?.note || '');
    setSheetOpen(true);
  };

  const gstPct = data?.estimate?.gstPercentage ?? 18;
  const draftEstimate = useMemo(() => {
    const priceById = new Map((data?.options || []).map(o => [String(o.id), Number(o.price) || 0]));
    const base = Object.entries(quantities).reduce((sum, [id, qty]) => sum + (priceById.get(id) || 0) * qty, 0);
    const gst = Math.round(base * gstPct) / 100;
    return { base, gst, total: base + gst };
  }, [quantities, data, gstPct]);

  const setQty = (id, qty) => setQuantities(prev => {
    const next = { ...prev };
    if (qty <= 0) delete next[id]; else next[id] = Math.min(MAX_QTY, qty);
    return next;
  });

  const selectedCount = Object.keys(quantities).length + (otherOn && otherNote.trim() ? 1 : 0);

  const save = async () => {
    if (otherOn && otherNote.trim().length < 3) {
      toast.error('Please describe the other problem');
      return;
    }
    setSaving(true);
    try {
      const res = await bookingService.updateExtraServices(bookingId, {
        items: Object.entries(quantities).map(([serviceId, quantity]) => ({ serviceId, quantity })),
        otherNote: otherOn ? otherNote.trim() : ''
      });
      if (res.success) {
        toast.success(res.message || 'Repair services updated');
        setSheetOpen(false);
        await load();
        onSaved?.();
      } else {
        toast.error(res.message || 'Could not update repair services');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update repair services');
      load();
    } finally {
      setSaving(false);
    }
  };

  if (!visible || !data) return null;
  const selected = data.selected || [];
  // Nothing to show if editing is closed and nothing was added
  if (!data.canEdit && selected.length === 0) return null;

  return (
    <>
      <section className="bg-white rounded-[20px] border border-gray-100 p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-full bg-accent-soft text-accent flex items-center justify-center shrink-0">
            <FiTool className="w-5 h-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-bold text-ink">
              {selected.length ? 'Repair services added' : 'Repair needed?'}
            </h3>
            <p className="text-[13px] text-gray-500 mt-0.5">
              {selected.length
                ? 'Your professional will include these in the final bill.'
                : 'After inspection, add the repair your professional found and they will take it up.'}
            </p>
          </div>
        </div>

        {selected.length > 0 && (
          <div className="mt-4 rounded-2xl bg-canvas px-3.5 py-3 space-y-2">
            {selected.map((item, index) => (
              <div key={item._id || index} className="flex items-start justify-between gap-3 text-[14px]">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {item.isOther ? 'Other problem' : item.title}
                    {!item.isOther && item.quantity > 1 && <span className="text-gray-500 font-normal"> × {item.quantity}</span>}
                  </p>
                  {item.isOther && <p className="text-[12px] text-gray-500 break-words">{item.note}</p>}
                </div>
                <span className="shrink-0 font-semibold text-ink">
                  {item.isOther ? <span className="text-[12px] font-medium text-gray-500">Priced by professional</span> : formatINR(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
            {data.estimate?.base > 0 && (
              <div className="pt-2 mt-1 border-t border-dashed border-gray-200 flex justify-between text-[13px]">
                <span className="text-gray-500">Estimated (incl. {gstPct}% GST)</span>
                <span className="font-bold text-ink">{formatINR(data.estimate.total)}</span>
              </div>
            )}
          </div>
        )}

        {data.canEdit ? (
          <button
            type="button"
            onClick={openPicker}
            className={`mt-4 w-full h-11 rounded-full text-[14px] font-semibold inline-flex items-center justify-center gap-2 transition-colors active:scale-[0.99] ${selected.length
              ? 'border border-gray-200 bg-white text-ink hover:border-gray-300'
              : 'bg-accent text-white hover:bg-accent-dark'}`}
          >
            {selected.length ? <><FiEdit3 className="w-4 h-4" /> Edit repair services</> : <><FiPlus className="w-4 h-4" /> Add repair service</>}
          </button>
        ) : (
          <p className="mt-3 inline-flex items-start gap-1.5 text-[12px] text-gray-500">
            <FiInfo className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {data.reason}
          </p>
        )}
      </section>

      {createPortal(
        <AnimatePresence>
          {sheetOpen && (
            <motion.div
              key="repair-sheet"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10000] bg-black/50 flex items-end sm:items-center justify-center"
              onClick={() => !saving && setSheetOpen(false)}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="Add repair services"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full sm:max-w-md rounded-t-[28px] sm:rounded-3xl max-h-[88vh] flex flex-col"
              >
                <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[18px] font-bold text-ink">What needs to be fixed?</h3>
                    <p className="text-[13px] text-gray-500 mt-0.5">Select what your professional found during inspection.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSheetOpen(false)}
                    aria-label="Close"
                    className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center shrink-0"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
                  {(data.options || []).length === 0 && (
                    <p className="text-[13px] text-gray-500 bg-canvas rounded-2xl px-4 py-3">
                      No listed repair services for this brand. Use “Other problem” below to describe it.
                    </p>
                  )}

                  {(data.options || []).map(option => {
                    const id = String(option.id);
                    const qty = quantities[id] || 0;
                    const checked = qty > 0;
                    return (
                      <div
                        key={id}
                        className={`rounded-2xl border px-3.5 py-3 transition-colors ${checked ? 'border-accent/50 bg-accent-soft/50' : 'border-gray-100 bg-white'}`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setQty(id, checked ? 0 : 1)}
                            aria-pressed={checked}
                            className="flex items-center gap-3 min-w-0 flex-1 text-left"
                          >
                            <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${checked ? 'bg-accent border-accent text-white' : 'border-gray-300 bg-white'}`}>
                              {checked && <FiCheck className="w-3.5 h-3.5" strokeWidth={3} />}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[14px] font-semibold text-ink">{option.title}</span>
                              <span className="block text-[12px] text-gray-500">
                                {option.pricingType === 'starting_from' ? `Starting from ${formatINR(option.price)}` : formatINR(option.price)}
                              </span>
                            </span>
                          </button>
                          {checked && (
                            <div className="inline-flex items-center h-8 rounded-lg border border-gray-200 bg-white shrink-0">
                              <button type="button" aria-label={`Decrease ${option.title}`} onClick={() => setQty(id, qty - 1)} className="w-8 h-full flex items-center justify-center text-accent">
                                <FiMinus className="w-3.5 h-3.5" strokeWidth={2.5} />
                              </button>
                              <span className="min-w-6 text-center text-[13px] font-bold text-ink">{qty}</span>
                              <button type="button" aria-label={`Increase ${option.title}`} disabled={qty >= MAX_QTY} onClick={() => setQty(id, qty + 1)} className="w-8 h-full flex items-center justify-center text-accent disabled:text-gray-300">
                                <FiPlus className="w-3.5 h-3.5" strokeWidth={2.5} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Other problem */}
                  <div className={`rounded-2xl border px-3.5 py-3 transition-colors ${otherOn ? 'border-accent/50 bg-accent-soft/50' : 'border-gray-100 bg-white'}`}>
                    <button
                      type="button"
                      onClick={() => setOtherOn(v => !v)}
                      aria-pressed={otherOn}
                      className="flex items-center gap-3 w-full text-left"
                    >
                      <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${otherOn ? 'bg-accent border-accent text-white' : 'border-gray-300 bg-white'}`}>
                        {otherOn && <FiCheck className="w-3.5 h-3.5" strokeWidth={3} />}
                      </span>
                      <span>
                        <span className="block text-[14px] font-semibold text-ink">Other problem</span>
                        <span className="block text-[12px] text-gray-500">Not in the list? Describe it — your professional will price it on the bill.</span>
                      </span>
                    </button>
                    {otherOn && (
                      <div className="mt-3">
                        <label htmlFor="repair-other-note" className="sr-only">Describe the problem</label>
                        <textarea
                          id="repair-other-note"
                          rows={3}
                          maxLength={MAX_NOTE}
                          value={otherNote}
                          onChange={(e) => setOtherNote(e.target.value)}
                          placeholder="e.g. Door hinge broken, turntable not rotating"
                          className="w-full px-3.5 py-3 rounded-xl bg-white border border-gray-200 text-[14px] text-ink placeholder:text-gray-400 resize-none focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/15"
                        />
                        <p className="text-right text-[11px] text-gray-400">{otherNote.length}/{MAX_NOTE}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 pt-3 border-t border-gray-100" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-[13px] text-gray-500">
                      {selectedCount} selected{draftEstimate.base > 0 ? ` · incl. ${gstPct}% GST` : ''}
                    </span>
                    <span className="text-[18px] font-bold text-ink">{formatINR(draftEstimate.total)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving || (selectedCount === 0 && (data.selected || []).length === 0)}
                    className="w-full h-12 rounded-full bg-accent text-white text-[15px] font-semibold hover:bg-accent-dark disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Saving…' : selectedCount === 0 ? 'Remove repair services' : 'Confirm repair services'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default RepairServicesCard;
