import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiX, FiLoader } from 'react-icons/fi';
import FieldControl from '../../../../../components/common/DetailFieldControl';

const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';

/**
 * The bottom sheet shown when a service has questions (brand, vehicle type...): the customer answers
 * them right here, then taps "Add to cart". The questions and which are required come from the
 * admin's category settings. `request` is { title, price, fields, onConfirm(answers) } or null.
 */
const SheetBody = ({ request, onClose }) => {
  const [answers, setAnswers] = useState(request.initialAnswers || {});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  const fields = request.fields || [];
  const missing = fields.filter((f) => f.required && isBlank(answers[f.key]));

  const confirm = async () => {
    if (missing.length || busy) return;
    setBusy(true);
    try {
      await request.onConfirm(answers);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10050] flex items-end justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !busy && onClose()}
        className="absolute inset-0 bg-black/45"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Choose options"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        className="relative z-10 flex max-h-[88vh] w-full max-w-2xl flex-col rounded-t-[28px] bg-white"
      >
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-gray-200" />
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-3">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-400">{request.heading || 'Choose options'}</p>
            <h3 className="mt-0.5 text-[18px] font-bold leading-snug text-gray-900">{request.title}</h3>
            {request.price ? <p className="mt-0.5 text-[14px] font-semibold text-gray-600">₹{Number(request.price).toLocaleString('en-IN')}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-4">
          {fields.map((field) => (
            <div key={field.key}>
              <p className="mb-2 text-[14px] font-bold text-gray-900">
                {field.label}{field.required && <span className="text-red-500"> *</span>}
              </p>
              <FieldControl
                field={field}
                chipLimit={14}
                value={answers[field.key]}
                onChange={(v) => setAnswers((prev) => ({ ...prev, [field.key]: v }))}
              />
              {field.helpText && <p className="mt-1.5 text-[12px] text-gray-500">{field.helpText}</p>}
            </div>
          ))}
        </div>

        <div className="shrink-0 border-t border-gray-100 px-5 pt-3" style={{ paddingBottom: 'max(16px, var(--safe-bottom))' }}>
          <button
            type="button"
            onClick={confirm}
            disabled={missing.length > 0 || busy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#6B38FB] text-[15px] font-bold text-white transition-all active:scale-[0.99] disabled:bg-gray-200 disabled:text-gray-500"
          >
            {busy && <FiLoader className="h-4 w-4 animate-spin" />}
            {missing.length > 0 ? `Select ${missing[0].label.toLowerCase()} to continue` : (request.confirmLabel || 'Add to cart')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ServiceOptionsSheet = ({ request, onClose }) => createPortal(
  <AnimatePresence>
    {request && <SheetBody key={request.title} request={request} onClose={onClose} />}
  </AnimatePresence>,
  document.body
);

export default ServiceOptionsSheet;
