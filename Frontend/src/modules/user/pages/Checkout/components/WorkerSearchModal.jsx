import React, { useEffect, useState } from 'react';
import { FiX, FiCheck, FiMapPin, FiUsers, FiBell, FiClock, FiMinimize2, FiRefreshCw } from 'react-icons/fi';
import { themeColors } from '../../../../../theme';
import ModalLock from '../../../../../components/common/ModalLock';

const NAVY = themeColors.button;
const AMBER = themeColors.brand.yellow;

// Fixed spots on the radar for alerted workers (angle in degrees, distance from
// centre as % of the radar's half-width), so dots don't jump between renders.
const WORKER_DOT_POSITIONS = [
  [-60, 30], [150, 36], [35, 40], [250, 26], [95, 32],
  [200, 42], [-20, 44], [120, 22], [300, 38], [170, 28]
];

const RADAR_STYLES = `
  @keyframes hu-radar-sweep { to { transform: rotate(360deg); } }
  @keyframes hu-radar-pulse {
    0% { transform: scale(0.35); opacity: 0.45; }
    100% { transform: scale(1); opacity: 0; }
  }
  @keyframes hu-dot-pop {
    0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
    70% { transform: translate(-50%, -50%) scale(1.25); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  }
  @keyframes hu-dot-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(214, 143, 53, 0.45); }
    50% { box-shadow: 0 0 0 6px rgba(214, 143, 53, 0); }
  }
  .hu-radar-sweep { animation: hu-radar-sweep 3.2s linear infinite; }
  .hu-radar-pulse { animation: hu-radar-pulse 2.8s ease-out infinite; }
  .hu-dot { animation: hu-dot-pop 0.45s ease-out both, hu-dot-glow 2s ease-in-out 0.45s infinite; }
  @media (prefers-reduced-motion: reduce) {
    .hu-radar-sweep, .hu-radar-pulse, .hu-dot { animation: none; }
  }
`;

const formatClock = (totalSeconds) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const Radar = ({ notifiedCount, icon }) => {
  const dots = WORKER_DOT_POSITIONS.slice(0, Math.min(notifiedCount, WORKER_DOT_POSITIONS.length));

  return (
    <div className="relative w-56 h-56 mx-auto">
      {/* Range rings */}
      <div className="absolute inset-0 rounded-full border" style={{ borderColor: `${NAVY}14`, background: `${NAVY}05` }} />
      <div className="absolute inset-[18%] rounded-full border" style={{ borderColor: `${NAVY}14` }} />
      <div className="absolute inset-[36%] rounded-full border" style={{ borderColor: `${NAVY}1f` }} />

      {/* Expanding pulses */}
      <div className="hu-radar-pulse absolute inset-0 rounded-full border-2" style={{ borderColor: `${NAVY}55` }} />
      <div className="hu-radar-pulse absolute inset-0 rounded-full border-2" style={{ borderColor: `${NAVY}55`, animationDelay: '1.4s' }} />

      {/* Rotating sweep */}
      <div
        className="hu-radar-sweep absolute inset-0 rounded-full"
        style={{ background: `conic-gradient(from 0deg, transparent 0deg, transparent 280deg, ${NAVY}10 300deg, ${NAVY}59 360deg)` }}
      />

      {/* Alerted workers */}
      {dots.map(([angle, dist], i) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <div
            key={i}
            className="hu-dot absolute w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md"
            style={{
              left: `${50 + dist * Math.cos(rad)}%`,
              top: `${50 + dist * Math.sin(rad)}%`,
              backgroundColor: AMBER,
              animationDelay: `${i * 0.12}s, ${0.45 + i * 0.12}s`
            }}
          >
            <FiUsers className="w-3 h-3 text-white" />
          </div>
        );
      })}

      {/* Centre: the customer's location */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[4.5rem] h-[4.5rem] rounded-full bg-white shadow-xl flex items-center justify-center p-1.5">
          <div className="w-full h-full rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: NAVY }}>
            {icon ? (
              <img src={icon} alt="" className="w-8 h-8 object-contain rounded-full bg-white p-1" />
            ) : (
              <FiMapPin className="w-6 h-6 text-white" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StepRow = ({ state, title, detail, isLast }) => {
  const done = state === 'done';
  const active = state === 'active';
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 ${active ? 'animate-pulse' : ''}`}
          style={{
            backgroundColor: done ? NAVY : 'white',
            borderColor: done || active ? NAVY : '#E5E7EB'
          }}
        >
          {done ? (
            <FiCheck className="w-3.5 h-3.5 text-white" />
          ) : (
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: active ? NAVY : '#E5E7EB' }} />
          )}
        </div>
        {!isLast && <div className="w-0.5 flex-1 min-h-[14px] my-0.5" style={{ backgroundColor: done ? NAVY : '#E5E7EB' }} />}
      </div>
      <div className={`pb-3 ${!done && !active ? 'opacity-50' : ''}`}>
        <p className="text-sm font-bold text-gray-900 leading-6">{title}</p>
        {detail && <p className="text-xs text-gray-500 -mt-0.5">{detail}</p>}
      </div>
    </div>
  );
};

/**
 * Checkout popup shown while we look for a worker.
 *
 * search (optional, filled from the create-booking response and then
 * 'booking_search_progress' socket events):
 *   { radiusKm, nearbyCount, notifiedCount, wave, maxSearchTimeMins, expiresAt }
 * booking (optional): { serviceName, categoryIcon, address, photosCount }
 */
const WorkerSearchModal = ({ isOpen, onClose, currentStep, acceptedWorker, onRetry, search, booking }) => {
  const [now, setNow] = useState(() => Date.now());

  const isSearching = currentStep === 'searching' || currentStep === 'waiting';

  useEffect(() => {
    if (!isOpen || !isSearching) return;
    const tick = () => setNow(Date.now());
    // Tick once right away so a reopened popup doesn't show a stale countdown
    const first = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [isOpen, isSearching]);

  if (!isOpen) return null;

  const notifiedCount = search?.notifiedCount || 0;
  const nearbyCount = search?.nearbyCount ?? null;
  const radiusKm = search?.radiusKm || null;
  const totalSecs = (search?.maxSearchTimeMins || 5) * 60;
  const expiresAtMs = search?.expiresAt ? new Date(search.expiresAt).getTime() : null;
  const secondsLeft = expiresAtMs ? Math.max(0, (expiresAtMs - now) / 1000) : null;
  const timeProgress = secondsLeft !== null ? Math.min(1, secondsLeft / totalSecs) : 1;

  // What the search is doing right now, in plain words
  let title = 'Sending your request';
  let subtitle = 'Creating your booking…';
  if (currentStep === 'waiting') {
    if (secondsLeft === 0) {
      title = 'Taking a little longer';
      subtitle = 'Still checking with professionals nearby';
    } else if (notifiedCount > 0) {
      title = 'Waiting for a professional';
      subtitle = `${notifiedCount} ${notifiedCount === 1 ? 'professional has' : 'professionals have'} your request`;
    } else {
      title = 'Finding professionals near you';
      subtitle = radiusKm ? `Looking within ${radiusKm} km of your address` : 'Looking near your address';
    }
  }

  const wave = search?.wave || 1;
  const steps = [
    {
      state: currentStep === 'waiting' ? 'done' : 'active',
      title: 'Request created',
      detail: booking?.photosCount ? `${booking.photosCount} photo${booking.photosCount > 1 ? 's' : ''} attached` : null
    },
    {
      state: currentStep !== 'waiting' ? 'pending' : notifiedCount > 0 ? 'done' : 'active',
      title: notifiedCount > 0 ? `${notifiedCount} professional${notifiedCount > 1 ? 's' : ''} alerted` : 'Alerting professionals',
      detail: wave > 1 ? 'Search widened to more professionals' : 'Closest ones are alerted first'
    },
    {
      state: currentStep === 'waiting' && notifiedCount > 0 ? 'active' : 'pending',
      title: 'Waiting for someone to accept',
      detail: null
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
      <ModalLock />
      <style>{RADAR_STYLES}</style>

      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden relative max-h-[94vh] overflow-y-auto">

        {isSearching && (
          <div className="px-5 pt-5 pb-6">
            {/* Header: what's being booked */}
            <div className="flex items-center gap-3 mb-4 pr-10">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden" style={{ backgroundColor: `${NAVY}10` }}>
                {booking?.categoryIcon
                  ? <img src={booking.categoryIcon} alt="" className="w-6 h-6 object-contain" />
                  : <FiBell className="w-5 h-5" style={{ color: NAVY }} />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{booking?.serviceName || 'Your service request'}</p>
                {booking?.address && (
                  <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                    <FiMapPin className="w-3 h-3 shrink-0" /> {booking.address}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Minimise"
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center active:scale-95 transition-transform"
            >
              <FiMinimize2 className="w-4 h-4" />
            </button>

            <Radar notifiedCount={currentStep === 'waiting' ? notifiedCount : 0} icon={booking?.categoryIcon} />

            {/* Status */}
            <div className="text-center mt-4 mb-4" aria-live="polite">
              <h3 className="text-xl font-black text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            </div>

            {/* Live numbers */}
            {currentStep === 'waiting' && search && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'Nearby', value: nearbyCount ?? '–', icon: FiUsers },
                  { label: 'Alerted', value: notifiedCount, icon: FiBell },
                  { label: 'Radius', value: radiusKm ? `${radiusKm} km` : '–', icon: FiMapPin }
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="rounded-2xl bg-gray-50 border border-gray-100 py-2.5 text-center">
                      <Icon className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: NAVY }} />
                      <p className="text-base font-black text-gray-900 leading-none">{stat.value}</p>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-1">{stat.label}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Time left */}
            {currentStep === 'waiting' && secondsLeft !== null && (
              <div className="mb-4">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-semibold text-gray-500 flex items-center gap-1"><FiClock className="w-3.5 h-3.5" /> Search time left</span>
                  <span className="font-black tabular-nums" style={{ color: secondsLeft < 30 ? themeColors.brand.orange : NAVY }}>
                    {formatClock(secondsLeft)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-1000 ease-linear"
                    style={{ width: `${timeProgress * 100}%`, backgroundColor: secondsLeft < 30 ? themeColors.brand.orange : NAVY }}
                  />
                </div>
              </div>
            )}

            {/* Progress steps */}
            <div className="rounded-2xl border border-gray-100 p-4 pb-1">
              {steps.map((step, i) => (
                <StepRow key={step.title} {...step} isLast={i === steps.length - 1} />
              ))}
            </div>

            <p className="text-[11px] text-gray-400 text-center mt-4">
              You can minimise this. We'll let you know as soon as someone accepts.
            </p>
          </div>
        )}

        {currentStep === 'accepted' && acceptedWorker && (
          <div className="flex flex-col items-center pt-10 pb-8 px-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5 shadow-xl" style={{ backgroundColor: themeColors.brand.green }}>
              <FiCheck className="w-10 h-10 text-white" strokeWidth={3} />
            </div>

            <h3 className="text-2xl font-black text-gray-900 mb-1">Professional found!</h3>
            <p className="text-sm text-gray-500 text-center mb-6">Your request has been accepted</p>

            <div className="w-full bg-gray-50 rounded-2xl p-5 border border-gray-100 mb-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-black shrink-0" style={{ backgroundColor: NAVY }}>
                {(acceptedWorker.businessName || acceptedWorker.name || 'P').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h4 className="font-black text-base text-gray-900 truncate">{acceptedWorker.businessName || acceptedWorker.name}</h4>
                {acceptedWorker.name && acceptedWorker.businessName && acceptedWorker.name !== acceptedWorker.businessName && (
                  <p className="text-xs text-gray-500 truncate">{acceptedWorker.name}</p>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full text-white py-4 rounded-2xl font-bold text-sm shadow-lg transition-all active:scale-95"
              style={{ backgroundColor: NAVY }}
            >
              Continue
            </button>
          </div>
        )}

        {currentStep === 'failed' && (
          <div className="flex flex-col items-center pt-10 pb-8 px-6">
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"
            >
              <FiX className="w-4 h-4" />
            </button>

            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5 bg-red-50 border-2 border-red-100">
              <FiX className="w-10 h-10 text-red-500" strokeWidth={3} />
            </div>

            <h3 className="text-2xl font-black text-gray-900 mb-1">No professional available</h3>
            <p className="text-sm text-gray-500 text-center mb-6 px-2">
              {radiusKm
                ? `No one within ${radiusKm} km could take this request right now. Please try again in a few minutes.`
                : "We couldn't find an available professional near you right now. Please try again in a few minutes."}
            </p>

            <button
              onClick={onRetry}
              className="w-full text-white py-4 rounded-2xl font-bold text-sm shadow-lg transition-all active:scale-95 mb-3 flex items-center justify-center gap-2"
              style={{ backgroundColor: NAVY }}
            >
              <FiRefreshCw className="w-4 h-4" /> Search again
            </button>
            <button
              onClick={onClose}
              className="w-full text-gray-500 py-3 rounded-2xl font-semibold text-sm"
            >
              Not now
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default WorkerSearchModal;
