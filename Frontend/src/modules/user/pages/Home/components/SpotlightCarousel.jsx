import React, { memo, useCallback, useEffect, useRef, useState } from 'react';

/**
 * In-the-spotlight carousel (Urban-Company-style hero banner).
 * Horizontal snap-scroll, peeks next card, dot pagination below.
 */

const DEFAULT_CARD = {
  backgroundColor: '#B4C2A8',
  textColor: '#1A1A1A',
  badgeColor: '#7A2149',
  buttonText: 'Book now'
};

const SpotlightCard = memo(({ item, onClick, priority }) => {
  const bg = item.backgroundColor || DEFAULT_CARD.backgroundColor;
  const txt = item.textColor || DEFAULT_CARD.textColor;
  const badgeBg = item.badgeColor || DEFAULT_CARD.badgeColor;

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative shrink-0 snap-start rounded-[20px] overflow-hidden text-left active:scale-[0.985] transition-transform duration-150"
      style={{
        backgroundColor: bg,
        width: 'min(85vw, 360px)',
        height: 190
      }}
      aria-label={item.title}
    >
      {/* Right-side image bleeds to edge */}
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className="absolute right-0 top-0 h-full w-[48%] object-cover object-left pointer-events-none"
        />
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-between h-full px-4 py-4 w-[58%]">
        <div>
          {item.badge && (
            <span
              className="inline-block text-white text-[11px] font-semibold px-2.5 py-1 rounded-md mb-2.5 whitespace-nowrap"
              style={{ backgroundColor: badgeBg }}
            >
              {item.badge}
            </span>
          )}
          <h3
            className="text-[20px] font-bold leading-[1.15] tracking-tight line-clamp-3"
            style={{ color: txt }}
          >
            {item.title}
          </h3>
          {(item.subtitle || item.startingPrice) && (
            <p className="mt-1.5 text-[13px] font-medium" style={{ color: txt, opacity: 0.9 }}>
              {item.subtitle || 'Starting'}
              {item.startingPrice && (
                <span className="ml-1.5 font-semibold">{item.startingPrice}</span>
              )}
            </p>
          )}
        </div>

        <div>
          <span className="inline-block bg-white text-black text-[13px] font-semibold px-4 py-1.5 rounded-lg shadow-sm">
            {item.buttonText || DEFAULT_CARD.buttonText}
          </span>
        </div>
      </div>
    </button>
  );
});
SpotlightCard.displayName = 'SpotlightCard';

const SpotlightCarousel = memo(({ items = [], onItemClick, title = 'In the spotlight' }) => {
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector('[data-spotlight-card]');
    const step = card ? card.offsetWidth + 12 : el.offsetWidth;
    const idx = Math.round(el.scrollLeft / step);
    if (idx !== activeIndex && idx >= 0 && idx < items.length) setActiveIndex(idx);
  }, [activeIndex, items.length]);

  // Auto-advance every 5s when multiple cards and not actively being touched
  const isTouchingRef = useRef(false);
  useEffect(() => {
    if (items.length <= 1) return undefined;
    const t = setInterval(() => {
      if (isTouchingRef.current) return;
      const el = scrollRef.current;
      if (!el) return;
      const card = el.querySelector('[data-spotlight-card]');
      const step = card ? card.offsetWidth + 12 : el.offsetWidth;
      const next = el.scrollLeft + step;
      const atEnd = next >= el.scrollWidth - el.offsetWidth + 10;
      el.scrollTo({ left: atEnd ? 0 : next, behavior: 'smooth' });
    }, 5000);
    return () => clearInterval(t);
  }, [items.length]);

  if (!items || items.length === 0) return null;

  return (
    <section className="pt-1">
      <div className="px-4 sm:px-5 mb-3">
        <h2 className="text-[20px] sm:text-[22px] font-bold text-ink tracking-tight leading-tight">
          {title}
        </h2>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onTouchStart={() => { isTouchingRef.current = true; }}
        onTouchEnd={() => { isTouchingRef.current = false; }}
        className="flex gap-3 overflow-x-auto px-4 scrollbar-hide snap-x snap-mandatory scroll-smooth scroll-px-4"
      >
        {items.map((item, idx) => (
          <div key={item.id || idx} data-spotlight-card className="shrink-0">
            <SpotlightCard
              item={item}
              onClick={() => onItemClick?.(item)}
              priority={idx === 0}
            />
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {items.map((_, idx) => (
            <span
              key={idx}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: idx === activeIndex ? 20 : 6,
                backgroundColor: idx === activeIndex ? '#1A1A1A' : '#D1D5DB'
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
});
SpotlightCarousel.displayName = 'SpotlightCarousel';

export default SpotlightCarousel;
