import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiChevronRight } from 'react-icons/fi';
import ServiceWithRatingCard from '../../../components/common/ServiceWithRatingCard';
import { NoteworthyCard } from './NewAndNoteworthy';
import { BookedServiceCard } from './MostBookedServices';
import { ApplianceServiceCard } from './ApplianceRepairSection';

// Same card the row uses, so a service looks identical in the row and in "See all"
const ROW_CARDS = {
  noteworthy: NoteworthyCard,
  booked: BookedServiceCard,
  appliance: ApplianceServiceCard,
};

const SectionSeeAllSheet = ({ section, onClose, onServiceClick, onAddClick }) => {
  const { title, subtitle, services = [], variant, category, onCategoryClick } = section;
  const RowCard = ROW_CARDS[variant];

  // Lock page scroll and close on Escape while open
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Portal to <body> so the screen covers the bottom nav and page wrappers
  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] bg-white overflow-y-auto overscroll-contain"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3 px-4 h-14">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            className="w-9 h-9 -ml-1.5 rounded-full flex items-center justify-center text-[#111827] hover:bg-gray-100 active:scale-95 transition-all"
          >
            <FiArrowLeft className="w-[22px] h-[22px]" />
          </button>
          <div className="min-w-0">
            <h2 className="text-[17px] font-bold text-[#111827] leading-tight truncate">{title}</h2>
            <p className="text-[12px] text-[#6B7280] leading-tight mt-0.5">
              {services.length} {services.length === 1 ? 'service' : 'services'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 pt-4 pb-10">
        {subtitle && <p className="text-[13px] text-[#6B7280] mb-4">{subtitle}</p>}

        {/* All services of the section */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-3.5 gap-y-6 sm:gap-x-5 *:w-full! *:min-w-0">
          {services.map((service, index) => (
            RowCard ? (
              <RowCard
                key={service.id || service._id || index}
                service={service}
                onServiceClick={onServiceClick}
                onAddClick={onAddClick}
              />
            ) : (
              <ServiceWithRatingCard
                key={service.id || service._id || index}
                title={service.title}
                rating={service.rating}
                reviews={service.reviews}
                price={service.price}
                originalPrice={service.originalPrice}
                discount={service.discount}
                optionsCount={service.optionsCount}
                image={service.image}
                fallbackImage={service.fallbackImage}
                onClick={() => onServiceClick?.(service)}
                onAddClick={() => onAddClick?.(service)}
              />
            )
          ))}
        </div>

        {/* Full catalogue of the related category */}
        {category && onCategoryClick && (
          <button
            type="button"
            onClick={onCategoryClick}
            className="mt-8 w-full flex items-center justify-between gap-3 rounded-2xl border border-[#E3E3E3] px-4 py-3.5 text-left hover:border-[#6E42E5]/40 hover:bg-[#F9F7FD] active:scale-[0.99] transition-all"
          >
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold text-[#111827]">Explore all {category.title} services</span>
              <span className="block text-[12px] text-[#6B7280] mt-0.5">Browse brands and every service in this category</span>
            </span>
            <FiChevronRight className="w-5 h-5 text-[#6E42E5] shrink-0" />
          </button>
        )}
      </div>
    </motion.div>,
    document.body
  );
};

export default SectionSeeAllSheet;
