import React, { useState } from 'react';
import { FiTool, FiRefreshCw, FiPhone, FiMail } from 'react-icons/fi';
import { useConfig } from '../../context/ConfigContext';

/**
 * Maintenance Screen
 *
 * Shown in place of the app while the isUnderMaintenance flag is on. The admin
 * panel is never wrapped by this, so maintenance can always be turned back off.
 *
 * Retry re-fetches the public config rather than reloading the page: when the
 * admin turns maintenance off, the socket push usually clears this screen on its
 * own, and the button is the manual fallback.
 */
const MaintenanceScreen = () => {
  const { config, refreshConfig } = useConfig();
  const [checking, setChecking] = useState(false);

  const message =
    config?.maintenanceMessage ||
    'We are performing scheduled maintenance. Please check back shortly.';

  const supportPhone = config?.supportPhone;
  const supportEmail = config?.supportEmail;

  const handleRetry = async () => {
    setChecking(true);
    try {
      await refreshConfig();
    } finally {
      // Brief delay so the spinner is visible even when the request is instant.
      setTimeout(() => setChecking(false), 600);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
          <FiTool className="h-9 w-9 text-amber-600" />
        </div>

        <h1 className="mb-3 text-2xl font-bold text-slate-900">
          We&apos;ll be right back
        </h1>

        <p className="mb-8 text-sm leading-relaxed text-slate-600">{message}</p>

        <button
          type="button"
          onClick={handleRetry}
          disabled={checking}
          className="mb-6 inline-flex w-full items-center justify-center gap-2 rounded-xl
            bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm
            transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FiRefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Checking…' : 'Try again'}
        </button>

        {(supportPhone || supportEmail) && (
          <div className="border-t border-slate-200 pt-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
              Need help?
            </p>
            <div className="flex flex-col items-center gap-2">
              {supportPhone && (
                <a
                  href={`tel:${supportPhone}`}
                  className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900"
                >
                  <FiPhone className="h-4 w-4" />
                  {supportPhone}
                </a>
              )}
              {supportEmail && (
                <a
                  href={`mailto:${supportEmail}`}
                  className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900"
                >
                  <FiMail className="h-4 w-4" />
                  {supportEmail}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenanceScreen;
