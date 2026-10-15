import React, { useRef, useEffect } from 'react';
import { createOptimizedScrollAnimation, createOptimizedStaggerAnimation } from '../../../../../utils/optimizedScrollTrigger';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import ServiceWithRatingCard from '../../../components/common/ServiceWithRatingCard';

const ServiceSectionWithRating = React.memo(({ title, subtitle, services, onSeeAllClick, onServiceClick, onAddClick }) => {
  const sectionRef = useRef(null);
  const titleRef = useRef(null);
  const cardsRef = useRef(null);

  // Defer GSAP scroll animations until after initial render for better performance
  useEffect(() => {
    // Skip animations on initial load to improve performance
    const shouldAnimate = typeof window !== 'undefined' &&
      (window.requestIdleCallback || window.setTimeout);

    if (!shouldAnimate || !sectionRef.current || !titleRef.current || !cardsRef.current) {
      // Show content immediately without animation
      if (titleRef.current) titleRef.current.style.opacity = '1';
      if (cardsRef.current) {
        Array.from(cardsRef.current.children).forEach(card => {
          card.style.opacity = '1';
          card.style.transform = 'none';
        });
      }
      return;
    }

    // Defer animation initialization until browser is idle
    const initAnimations = () => {
      const cards = Array.from(cardsRef.current?.children || []);
      if (cards.length === 0) return;

      const cleanupFunctions = [];

      // Animate title
      const titleCleanup = createOptimizedScrollAnimation(
        titleRef.current,
        {
          from: { y: 30, opacity: 0 },
          to: { y: 0, opacity: 1 },
          duration: 0.6,
          ease: 'power2.out',
        },
        { rootMargin: '100px' }
      );
      if (titleCleanup) cleanupFunctions.push(titleCleanup);

      // Stagger animate cards
      const cardsCleanup = createOptimizedStaggerAnimation(
        cards,
        {
          from: { x: 50, opacity: 0, scale: 0.9 },
          to: { x: 0, opacity: 1, scale: 1 },
          duration: 0.5,
          stagger: 0.08,
          ease: 'back.out(1.7)',
        },
        { rootMargin: '150px' }
      );
      if (cardsCleanup) cleanupFunctions.push(cardsCleanup);

      return () => {
        cleanupFunctions.forEach(cleanup => cleanup?.());
      };
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if (window.requestIdleCallback) {
      const idleCallback = window.requestIdleCallback(initAnimations, { timeout: 2000 });
      return () => {
        if (idleCallback) window.cancelIdleCallback(idleCallback);
      };
    } else {
      const timeout = setTimeout(initAnimations, 500);
      return () => clearTimeout(timeout);
    }
  }, []); // Empty deps - only run once on mount

  const scrollBy = (direction) => {
    cardsRef.current?.scrollBy({ left: direction === 'left' ? -240 : 240, behavior: 'smooth' });
  };

  if (!services || services.length === 0) {
    return null;
  }

  return (
    <section ref={sectionRef} className="w-full">
      {/* Header: bold title (+ subtitle) and outlined "See all" */}
      <div ref={titleRef} className="px-4 sm:px-5 mb-3 flex items-center justify-between gap-3" style={{ opacity: 1 }}>
        <div className="min-w-0">
          <h2 className="text-[20px] sm:text-[22px] font-bold text-[#111827] tracking-tight leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[13px] sm:text-sm text-[#6B7280] mt-0.5 leading-snug">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onSeeAllClick && (
            <button
              type="button"
              onClick={() => onSeeAllClick(services)}
              className="text-[14px] font-semibold text-[#6E42E5] hover:text-[#582CD0] active:scale-95 transition-all"
            >
              See all
            </button>
          )}
          {/* Scroll controls for desktop */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollBy('left')}
              aria-label="Previous"
              className="w-8 h-8 rounded-full flex items-center justify-center border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <FiChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy('right')}
              aria-label="Next"
              className="w-8 h-8 rounded-full flex items-center justify-center border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={cardsRef}
        className="flex items-stretch gap-3.5 overflow-x-auto px-4 sm:px-5 pb-2 scrollbar-hide overscroll-x-contain scroll-smooth"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {services.map((service) => (
          <ServiceWithRatingCard
            key={service.id}
            title={service.title}
            rating={service.rating}
            reviews={service.reviews}
            price={service.price}
            originalPrice={service.originalPrice}
            discount={service.discount}
            badge={service.badge}
            optionsCount={service.optionsCount}
            image={service.image}
            fallbackImage={service.fallbackImage}
            onClick={() => onServiceClick?.(service)}
            onAddClick={() => onAddClick?.(service)}
          />
        ))}
      </div>
    </section>
  );
});

ServiceSectionWithRating.displayName = 'ServiceSectionWithRating';

export default ServiceSectionWithRating;

