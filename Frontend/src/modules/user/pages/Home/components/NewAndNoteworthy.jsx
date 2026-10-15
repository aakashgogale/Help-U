import React, { memo, useEffect, useRef, useState } from 'react';
import { optimizeCloudinaryUrl } from '../../../../../utils/cloudinaryOptimize';

// Fallback images when admin item has no image. Keyword match → asset path.
const FALLBACK_RULES = [
  { test: /salon|luxe|spa|beauty|facial|wax/i, src: '/noteworthy/salon-luxe.jpg' },
  { test: /purifier|r\.?o|water/i, src: '/noteworthy/water-purifier.jpg' },
  { test: /bathroom|toilet|kitchen clean|clean/i, src: '/noteworthy/bathroom-cleaning.jpg' },
  { test: /hair studio|updo|style|hair|women/i, src: '/noteworthy/hair-studio.jpg' }
];

const getFallbackImage = (title) => {
  const match = FALLBACK_RULES.find(r => r.test.test(title || ''));
  return match ? match.src : '/noteworthy/salon-luxe.jpg';
};

const resolveImage = (raw, title) => {
  if (!raw) return getFallbackImage(title);
  if (raw.startsWith('http')) {
    return optimizeCloudinaryUrl(raw, { width: 360, quality: 'auto', crop: 'fill' });
  }
  return raw;
};

const NoteworthyCard = memo(({ service, onServiceClick }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const title = service.title || 'Service';
  const src = imageFailed ? getFallbackImage(title) : resolveImage(service.image, title);

  // The admin's "badge" field is used for the top-left pill badge.
  // "duration" (in minutes) feeds the "⚡ In X mins" chip under the title.
  const topBadge = service.badge || null;
  const etaMinutes = Number(service.duration) || null;

  return (
    <div
      onClick={() => onServiceClick?.(service)}
      className="w-[136px] sm:w-[152px] flex-shrink-0 flex flex-col cursor-pointer group active:scale-[0.98] transition-transform duration-150 select-none"
    >
      {/* Image: square, soft rounded corners */}
      <div className="relative w-full aspect-square rounded-[18px] sm:rounded-[20px] overflow-hidden bg-[#F2F3F5]">
        <img
          src={src}
          alt={title}
          onError={() => setImageFailed(true)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
        {topBadge && (
          <span className="absolute top-2 left-2 bg-[#7B183E] text-white text-[11px] font-semibold px-2 py-0.5 rounded-[6px] shadow-sm tracking-tight">
            {topBadge}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="mt-2 text-[14px] leading-[18px] font-medium text-[#18181B] line-clamp-2" title={title}>
        {title}
      </h3>

      {/* ETA badge (only when minutes present) */}
      {etaMinutes > 0 && (
        <div className="mt-1 flex items-center gap-1 text-[13px] font-medium text-[#047857]">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#047857]" fill="currentColor" aria-hidden="true">
            <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>
          </svg>
          <span>In {etaMinutes} mins</span>
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
    <section className="w-full">
      {/* Header */}
      <div className="px-4 sm:px-5 mb-3 flex items-center justify-between gap-3">
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

      {/* Swipeable row */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-3.5 overflow-x-auto px-4 sm:px-5 pb-2 scrollbar-hide overscroll-x-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
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
