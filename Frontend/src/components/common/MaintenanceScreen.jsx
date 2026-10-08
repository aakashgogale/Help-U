import React, { useState } from 'react';
import { FiRefreshCw, FiPhone, FiMail, FiClock } from 'react-icons/fi';
import { useConfig } from '../../context/ConfigContext';
import Logo from './Logo';

/**
 * Maintenance Screen
 *
 * Shown in place of the user and partner apps while the isUnderMaintenance flag
 * is on. The admin panel is never wrapped by this, so maintenance can always be
 * turned back off.
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
      setTimeout(() => setChecking(false), 700);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#0F2B48]">
      {/* Ambient brand glow. Pointer-events are off so nothing here blocks the
          retry button, and the whole layer is decorative. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#1E4C82] opacity-40 blur-3xl" />
        <div className="absolute -right-20 top-1/3 h-72 w-72 rounded-full bg-[#D68F35] opacity-20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-[#BB5F36] opacity-20 blur-3xl" />
      </div>

      {/* Subtle grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '44px 44px'
        }}
      />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="mb-10 flex justify-center">
            <div className="rounded-2xl bg-white/95 px-5 py-3 shadow-lg shadow-black/20 backdrop-blur">
              <Logo className="h-10 w-auto" />
            </div>
          </div>

          {/* Animated wrench badge */}
          <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#D68F35] opacity-20" />
            <span className="absolute inset-2 rounded-full bg-[#D68F35] opacity-20" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#D68F35] to-[#BB5F36] shadow-lg shadow-[#BB5F36]/40">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 origin-center animate-[wrench_2.4s_ease-in-out_infinite] text-white"
              >
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </div>
          </div>

          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#F0C68A] ring-1 ring-inset ring-white/15">
            <FiClock className="h-3 w-3" />
            Temporarily offline
          </div>

          <h1 className="mb-3 text-[28px] font-bold leading-tight text-white">
            We&apos;ll be right back
          </h1>

          <p className="mb-9 text-[15px] leading-relaxed text-slate-300">{message}</p>

          <button
            type="button"
            onClick={handleRetry}
            disabled={checking}
            className="group mb-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl
              bg-gradient-to-r from-[#D68F35] to-[#BB5F36] px-5 py-3.5 text-[15px] font-semibold
              text-white shadow-lg shadow-[#BB5F36]/30 transition-all
              hover:shadow-xl hover:shadow-[#BB5F36]/40 active:scale-[0.98]
              disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100"
          >
            <FiRefreshCw
              className={`h-4 w-4 transition-transform ${
                checking ? 'animate-spin' : 'group-hover:rotate-90'
              }`}
            />
            {checking ? 'Checking…' : 'Try again'}
          </button>

          <p className="mb-10 text-xs text-slate-400">
            This page updates automatically once we&apos;re back
          </p>

          {(supportPhone || supportEmail) && (
            <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-inset ring-white/10 backdrop-blur-sm">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Need help right away?
              </p>
              <div className="flex flex-col gap-2.5">
                {supportPhone && (
                  <a
                    href={`tel:${supportPhone}`}
                    className="inline-flex items-center justify-center gap-2 text-sm font-medium
                      text-white transition-colors hover:text-[#F0C68A]"
                  >
                    <FiPhone className="h-4 w-4 text-[#D68F35]" />
                    {supportPhone}
                  </a>
                )}
                {supportEmail && (
                  <a
                    href={`mailto:${supportEmail}`}
                    className="inline-flex items-center justify-center gap-2 break-all text-sm
                      font-medium text-white transition-colors hover:text-[#F0C68A]"
                  >
                    <FiMail className="h-4 w-4 shrink-0 text-[#D68F35]" />
                    {supportEmail}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 pb-7 text-center">
        <p className="text-[11px] text-slate-500">
          © {new Date().getFullYear()} Help U · Every Service. One Help.
        </p>
      </div>

      {/* Scoped so the keyframes ship with the component rather than relying on
          a global stylesheet entry. */}
      <style>{`
        @keyframes wrench {
          0%, 100% { transform: rotate(-12deg); }
          50%      { transform: rotate(12deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[wrench_2\\.4s_ease-in-out_infinite\\],
          .animate-ping,
          .animate-spin {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default MaintenanceScreen;
