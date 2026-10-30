import React, { memo, useEffect, useRef, useState } from 'react';
import { optimizeCloudinaryUrl } from '../../../../../utils/cloudinaryOptimize';

const resolveImage = (raw) => {
  if (!raw) return null;
  if (raw.startsWith('http')) {
    return optimizeCloudinaryUrl(raw, { width: 360, quality: 'auto', crop: 'fill' });
  }
  return raw;
};

const NoteworthyCard = memo(({ service, onServiceClick }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const title = service.title || 'Service';
  const src = imageFailed ? null : resolveImage(service.image);

  // The admin's "badge" field is used for the top-left pill badge.
  // "duration" (in minutes) feeds the "⚡ In X mins" chip under the title.
  const topBadge = service.badge || null;
  const etaMinutes = Number(service.duration) || null;

  return (
    <div
      onClick={() => onServiceClick?.(service)}
      className="w-[calc((100vw-52px)/3)] min-w-[100px] max-w-[126px] sm:w-[140px] sm:max-w-none flex-shrink-0 flex flex-col cursor-pointer group active:scale-[0.98] transition-transform duration-150 select-none"
    >
      {/* Image: square, soft rounded corners */}
      <div className="relative w-full aspect-square rounded-[16px] sm:rounded-[18px] overflow-hidden bg-[#F2F3F5]">
        {src ? (
          <img
            src={src}
            alt={title}
            onError={() => setImageFailed(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <img src="/helpu-logo.png" alt="" className="w-12 h-12 object-contain opacity-30 grayscale" />
          </div>
        )}
        {topBadge && (
          <span className="absolute top-1.5 left-1.5 bg-[#7B183E] text-white text-[9.5px] sm:text-[10.5px] font-bold px-1.5 py-0.5 rounded-[5px] shadow-sm tracking-tight leading-none">
            {topBadge}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="mt-1.5 text-[12px] sm:text-[13px] leading-[16px] font-semibold text-[#18181B] line-clamp-2 min-h-[32px]" title={title}>
        {title}
      </h3>

      {/* ETA badge (only when minutes present) */}
      {etaMinutes > 0 && (
        <div className="mt-0.5 flex items-center gap-1 text-[11px] sm:text-[12px] font-bold text-[#047857]">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-3 h-3 fill-[#047857] shrink-0" fill="currentColor" aria-hidden="true">
            <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>
          </svg>
          <span className="truncate">In {etaMinutes}m</span>
        </div>
      )}
    </div>
  );
});
NoteworthyCard.displayName = 'NoteworthyCard';

const NewAndNoteworthy = React.memo(({ services, onServiceClick, onSeeAllClick }) => {
  const serviceList = (services || []).filter(s => s && s.title);
  const scrollRef = useRef(null);

  useEffect(() => { /* no-op; keep ref consistent across re-renders */ }, [serviceList.length]);

  if (serviceList.length === 0) return null;

  return (
    <section className="w-full max-w-full overflow-hidden min-w-0">
      {/* Header */}
      <div className="px-4 sm:px-5 mb-2.5 flex items-center justify-between gap-3">
        <h2 className="text-[20px] sm:text-[22px] font-bold text-[#111827] tracking-tight leading-tight">
          New and noteworthy
        </h2>
        {onSeeAllClick && (
          <button
            type="button"
            onClick={() => onSeeAllClick(serviceList)}
            className="text-[13px] font-semibold text-gray-500 hover:text-gray-900"
          >
            See all
          </button>
        )}
      </div>

      {/* Swipeable row - precisely fits 3 cards on mobile with 16px left indentation */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-2.5 sm:gap-3.5 overflow-x-auto px-4 sm:px-5 pb-2 scrollbar-hide overscroll-x-contain scroll-pl-4 sm:scroll-pl-5"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
      >
        {serviceList.map((service, index) => (
          <NoteworthyCard
            key={service.id || service._id || index}
            service={service}
            onServiceClick={onServiceClick}
          />
        ))}
      </div>
    </section>
  );
});
NewAndNoteworthy.displayName = 'NewAndNoteworthy';

export { NoteworthyCard };
export default NewAndNoteworthy;
