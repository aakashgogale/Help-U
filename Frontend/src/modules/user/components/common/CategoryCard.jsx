import React, { useRef, memo, useEffect } from 'react';
import { gsap } from 'gsap';

import { themeColors } from '../../../../theme';

const CategoryCard = memo(({ icon, title, onClick, hasSaleBadge = false, index = 0, iconBg = '#EEF1F4' }) => {
  const cardRef = useRef(null);

  // Simple entrance animation
  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { y: 15, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          delay: index * 0.05,
          ease: 'power2.out',
        }
      );
    }
  }, [index]);

  return (
    <button
      type="button"
      ref={cardRef}
      className="flex flex-col items-center justify-start cursor-pointer relative group transition-transform duration-300 ease-out active:scale-95 w-full"
      onClick={onClick}
      style={{
        opacity: 0, // Start hidden for GSAP
      }}
    >
      <div
        className="w-[68px] h-[68px] sm:w-[76px] sm:h-[76px] rounded-full flex items-center justify-center relative shrink-0 transition-all duration-300 group-hover:-translate-y-1"
        style={{ backgroundColor: iconBg }}
      >
        {icon || (
          <svg
            className="w-7 h-7 text-gray-400 group-hover:text-accent transition-colors duration-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
        {hasSaleBadge && (
          <div
            className="absolute -top-1 -right-1.5 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg z-10 border border-white"
            style={{
              background: themeColors.gradient,
              boxShadow: `0 4px 12px ${themeColors.brand.teal}4D`
            }}
          >
            SALE
          </div>
        )}
      </div>
      <span
        className="mt-2.5 text-[13px] sm:text-sm text-center text-ink font-semibold leading-[1.25] tracking-tight w-full line-clamp-2 px-0.5 group-hover:text-accent transition-colors duration-300 break-words"
      >
        {title}
      </span>
    </button>
  );
});

CategoryCard.displayName = 'CategoryCard';

export default CategoryCard;
