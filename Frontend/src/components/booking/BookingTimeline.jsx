import React, { useState } from 'react';
import { FiActivity, FiChevronDown } from 'react-icons/fi';
import { buildBookingTimeline } from '../../utils/bookingTimeline';

const TONE_DOT = {
  info: 'bg-sky-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500'
};

const formatAt = (date) =>
  date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/**
 * Detailed booking lifecycle (requested → searching → accepted → on the way →
 * arrived → work done → payment → completed → reviewed, plus disputes,
 * refunds and reassignments). Shared by the user app, worker app and admin.
 *
 * Collapsed to the latest few entries by default; `defaultExpanded` shows all.
 */
const BookingTimeline = ({ booking, title = 'Booking Timeline', defaultExpanded = false, className = '' }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const items = buildBookingTimeline(booking);
  if (items.length === 0) return null;

  const COLLAPSED_COUNT = 4;
  const visible = expanded ? items : items.slice(-COLLAPSED_COUNT);
  const hiddenCount = items.length - visible.length;

  return (
    <section className={`bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center gap-2">
        <FiActivity className="w-4 h-4 text-gray-500" />
        <h3 className="font-bold text-gray-900">{title}</h3>
      </div>

      <div className="p-5">
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="mb-3 text-xs font-semibold text-sky-700 flex items-center gap-1"
          >
            <FiChevronDown className="w-3.5 h-3.5" /> Show {hiddenCount} earlier update{hiddenCount > 1 ? 's' : ''}
          </button>
        )}

        <ol className="relative">
          {visible.map((item, index) => {
            const isLast = index === visible.length - 1;
            return (
              <li key={item.key} className="relative pl-6 pb-4 last:pb-0">
                {!isLast && <span className="absolute left-[5px] top-3 bottom-0 w-px bg-gray-200" aria-hidden="true" />}
                <span
                  className={`absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full ring-4 ring-white ${TONE_DOT[item.tone] || TONE_DOT.info}`}
                  aria-hidden="true"
                />
                <p className={`text-sm leading-snug ${isLast ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                  {item.label}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {formatAt(item.at)}
                  {item.by ? ` · ${item.by}` : ''}
                </p>
                {item.note && <p className="text-xs text-gray-500 mt-1">{item.note}</p>}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
};

export default BookingTimeline;
