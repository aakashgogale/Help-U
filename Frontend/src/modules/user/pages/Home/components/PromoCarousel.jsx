import React, { useState, useEffect, useRef, memo } from 'react';
import { gsap } from 'gsap';
import PromoCard from '../../../components/common/PromoCard';
import { themeColors } from '../../../../../theme';
import promo1 from '../../../../../assets/images/pages/Home/promo-carousel/1764052270908-bae94c.jpg';
import promo2 from '../../../../../assets/images/pages/Home/promo-carousel/1678450687690-81f922.jpg';
import promo3 from '../../../../../assets/images/pages/Home/promo-carousel/1745822547742-760034.jpg';
import promo4 from '../../../../../assets/images/pages/Home/promo-carousel/1711428209166-2d42c0.jpg';
import promo5 from '../../../../../assets/images/pages/Home/promo-carousel/1762785595543-540198.jpg';
import promo6 from '../../../../../assets/images/pages/Home/promo-carousel/1678454437383-aa4984.jpg';

const PromoCarousel = memo(({ promos, onPromoClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef(null);
  const intervalRef = useRef(null);
  const carouselRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);



  const promotionalCards = promos || [];

  // Auto-scroll functionality
  useEffect(() => {
    if (isHovered || promotionalCards.length <= 1) return;

    const interval = setInterval(() => {
      if (!scrollContainerRef.current) return;

      const container = scrollContainerRef.current;
      const card = container.querySelector('[data-promo-card]');
      const cardWidth = card ? card.offsetWidth + 12 : container.offsetWidth;

      let nextScrollLeft = container.scrollLeft + cardWidth;

      if (nextScrollLeft >= container.scrollWidth - container.offsetWidth + 10) {
        nextScrollLeft = 0;
      }

      container.scrollTo({
        left: nextScrollLeft,
        behavior: 'smooth'
      });

    }, 4500);

    return () => clearInterval(interval);
  }, [isHovered, promotionalCards.length]);

  // Trigger index update on scroll
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const card = container.querySelector('[data-promo-card]');
      const cardWidth = card ? card.offsetWidth + 12 : container.offsetWidth;
      const index = Math.round(container.scrollLeft / cardWidth);

      if (index !== currentIndex && index >= 0 && index < promotionalCards.length) {
        setCurrentIndex(index);
      }
    }
  };

  // Entrance animation
  useEffect(() => {
    if (carouselRef.current) {
      gsap.fromTo(carouselRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
      );
    }
  }, []);

  if (!promos || promos.length === 0) {
    return null;
  }

  return (
    <div
      ref={carouselRef}
      className="w-full max-w-full relative overflow-hidden min-w-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex gap-3 overflow-x-auto px-4 scrollbar-hide snap-x snap-mandatory scroll-smooth scroll-px-4 overscroll-x-contain"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
      >
        {promotionalCards.map((promo, index) => (
          <div
            key={promo.id || promo._id || index}
            data-promo-card
            className="shrink-0 snap-start flex justify-center"
          >
            <PromoCard
              title={promo.title}
              subtitle={promo.subtitle}
              buttonText={promo.buttonText}
              image={promo.image}
              priority={index === 0}
              onClick={() => onPromoClick?.(promo)}
            />
          </div>
        ))}
      </div>
    </div>
  );
});

PromoCarousel.displayName = 'PromoCarousel';

export default PromoCarousel;

