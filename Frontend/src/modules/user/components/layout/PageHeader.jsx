import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import NotificationBell from '../common/NotificationBell';

/**
 * Sticky white page header used by the user tab pages (Bookings, Scrap, Cart, Account).
 * `children` renders under the title row (e.g. filter tabs).
 */
const PageHeader = ({ title, badge, onBack, showBell = true, children }) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-white">
      <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack || (() => navigate(-1))}
            aria-label="Go back"
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-ink hover:bg-gray-100 active:scale-95 transition-all"
          >
            <FiArrowLeft className="w-[22px] h-[22px]" />
          </button>
          <h1 className="text-[20px] font-bold text-ink tracking-tight truncate">{title}</h1>
          {badge != null && badge !== false && (
            <span className="shrink-0 min-w-6 h-6 px-2 rounded-full bg-accent-soft text-accent text-[12px] font-bold flex items-center justify-center">
              {badge}
            </span>
          )}
        </div>
        {showBell && <NotificationBell />}
      </div>
      {children ? (
        <div className="border-b border-gray-100">{children}</div>
      ) : (
        <div className="border-b border-gray-100" />
      )}
    </header>
  );
};

export default PageHeader;
