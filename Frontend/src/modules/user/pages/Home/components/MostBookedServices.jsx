import React, { useRef, useState, useEffect, memo } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { AiFillStar } from 'react-icons/ai';
import { optimizeCloudinaryUrl } from '../../../../../utils/cloudinaryOptimize';

// High-resolution realistic service assets
import washingMachineImg from '../../../../../assets/images/pages/Home/NewAndNoteworthy/washing-machine.jpg';
import fanRepairImg from '../../../../../assets/images/pages/Home/NewAndNoteworthy/fan-repair.jpg';
import geyserRepairImg from '../../../../../assets/images/pages/Home/MostBookedServices/geyser-repair.jpg';
import switchSocketImg from '../../../../../assets/images/pages/Home/MostBookedServices/switch-socket.jpg';
import acRepairImg from '../../../../../assets/images/pages/Home/NewAndNoteworthy/ac-repair.jpg';

const formatPrice = (p) => {
  if (p === null || p === undefined || p === '') return null;
  const clean = p.toString().replace(/[^0-9]/g, '');
  return clean ? new Intl.NumberFormat('en-IN').format(clean) : null;
};

// Map keywords to high-resolution realistic photography
const getFallbackImageForTitle = (title) => {
  if (!title) return washingMachineImg;
  const t = title.toLowerCase();
  if (t.includes('washing') || t.includes('washer') || t.includes('machine')) return washingMachineImg;
  if (t.includes('fan') || t.includes('ceiling fan')) return fanRepairImg;
  if (t.includes('geyser') || t.includes('heater') || t.includes('water heater')) return geyserRepairImg;
  if (t.includes('switch') || t.includes('socket') || t.includes('electrician') || t.includes('board')) return switchSocketImg;
  if (t.includes('ac ') || t.includes('air conditioner') || t === 'ac') return acRepairImg;
  return washingMachineImg;
};

const getFallbackData = (title) => {
  const t = (title || '').toLowerCase();
  if (t.includes('washing')) {
    return { rating: '4.79', reviews: '103K', price: '199', options: 1 };
  }
  if (t.includes('fan')) {
    return { rating: '4.85', reviews: '195K', price: '99', options: 2 };
  }
  if (t.includes('geyser') || t.includes('heater')) {
    return { rating: '4.87', reviews: '47K', price: '249', options: 3 };
  }
  if (t.includes('switch') || t.includes('socket')) {
    return { rating: '4.84', reviews: '78K', price: '79', options: 2 };
  }
  if (t.includes('ac')) {
    return { rating: '4.82', reviews: '870K', price: '299', options: 4 };
  }
  return { rating: '4.80', reviews: '50K+', price: '199', options: 1 };
};

export const BookedServiceCard = memo(({ service, onServiceClick, onAddClick }) => {
  const [imageFailed, setImageFailed] = useState(false);

  const title = service.title || 'Popular Service';
  const fallbackImg = getFallbackImageForTitle(title);
  const fallbackData = getFallbackData(title);

  const rawImage = service.image;
  // Exclude low-res legacy webp assets if present
  const isSuspiciousImage = rawImage && (
    rawImage.includes('automatic-top-load-machine.webp') ||
    rawImage.includes('fan-repairs.webp') ||
    rawImage.includes('intense-bathroom')
  );

  let initialSrc = fallbackImg;
  if (rawImage && !isSuspiciousImage && !imageFailed) {
    if (rawImage.startsWith('http')) {
      initialSrc = optimizeCloudinaryUrl(rawImage, { width: 360, quality: 'auto', crop: 'fill' });
    } else {
      initialSrc = rawImage;
    }
  }

  const rating = service.rating || fallbackData.rating;
  const reviews = service.reviews || fallbackData.reviews;

  const rawOptions = parseInt(service.optionsCount, 10);
  const options = !isNaN(rawOptions) && rawOptions > 0 ? rawOptions : fallbackData.options;
  const hasOptions = options > 1;

  const displayPrice = formatPrice(service.price) || fallbackData.price;
  const displayOriginalPrice = formatPrice(service.originalPrice);

  return (
    <div
      onClick={() => onServiceClick?.(service)}
      className="w-[144px] sm:w-[158px] flex-shrink-0 flex flex-col cursor-pointer group active:scale-[0.98] transition-transform duration-150 select-none"
    >
      {/* Rounded-square image container with 18px corners */}
      <div className="relative w-full aspect-square rounded-[18px] overflow-hidden bg-[#F5F5F7]">
        <img
          src={imageFailed ? fallbackImg : initialSrc}
          alt={title}
          onError={() => setImageFailed(true)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
        {(service.discount || service.badge) && (
          <span className="absolute top-2 left-2 text-white text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#6E42E5]">
            {service.discount || service.badge}
          </span>
        )}
      </div>

      {/* Service name: 2 lines max with fixed height for consistent alignment */}
      <h3
        className="mt-2.5 text-[14px] leading-[19px] font-medium text-[#18181B] line-clamp-2"
        title={title}
      >
        {title}
      </h3>

      {/* Star rating row: charcoal star + rating + (reviews count) */}
      <div className="mt-1 flex items-center gap-1 text-[12.5px] leading-4 text-[#3F3F46]">
        <AiFillStar className="w-3.5 h-3.5 text-[#27272A] flex-shrink-0" />
        <span className="font-semibold text-[#18181B]">{rating}</span>
        {reviews && (
          <span className="text-[#52525B]">({reviews})</span>
        )}
      </div>

      {/* Bottom row: Starts at ₹... & Outlined Purple Add button */}
      <div className="mt-auto pt-2.5 flex items-end justify-between gap-1">
        <div className="flex flex-col justify-end">
          {hasOptions && (
            <span className="text-[11px] leading-[14px] font-normal text-[#71717A]">
              Starts at
            </span>
          )}
          <div className="flex items-baseline gap-1">
            <span className="text-[15px] sm:text-[16px] leading-[20px] font-bold text-[#18181B]">
              ₹{displayPrice}
            </span>
            {displayOriginalPrice && (
              <span className="text-[11px] text-[#A1A1AA] line-through">
                ₹{displayOriginalPrice}
              </span>
            )}
          </div>
        </div>

        {/* Outlined purple Add button with options count intersecting bottom border */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddClick?.(service);
            }}
            aria-label={`Add ${title}`}
            className="w-[66px] h-[34px] rounded-[9px] bg-white border border-[#E4E4E7] shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-center justify-center transition-all duration-200 hover:border-[#6E42E5]/60 hover:bg-[#F9F7FD] active:scale-95"
          >
            <span className="text-[14px] font-bold text-[#6E42E5] tracking-tight">
              Add
            </span>
          </button>
          {hasOptions && (
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-white px-1 text-[9.5px] leading-[11px] font-medium text-[#71717A] whitespace-nowrap pointer-events-none">
              {options} options
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

BookedServiceCard.displayName = 'BookedServiceCard';

const MostBookedServices = React.memo(({ services, onServiceClick, onAddClick, onSeeAllClick }) => {
  const serviceList = (services || []).filter(s => s && s.title);
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [serviceList]);

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 240;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (serviceList.length === 0) {
    return null;
  }

  const arrowClass = (enabled) => `w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
    enabled
      ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm'
      : 'bg-transparent border-transparent text-gray-300 cursor-default'
  }`;

  return (
    <section className="w-full">
      {/* Header: Bold black title + Desktop arrows */}
      <div className="px-4 sm:px-5 mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[20px] sm:text-[22px] font-bold text-[#111827] tracking-tight leading-tight">
          Most booked services
        </h2>

        <div className="flex items-center gap-2 shrink-0">
          {onSeeAllClick && (
            <button
              type="button"
              onClick={() => onSeeAllClick(serviceList)}
              className="text-[13px] font-semibold text-gray-500 hover:text-gray-900 transition-colors"
            >
              See all
            </button>
          )}
          {/* Scroll controls for desktop */}
          <div className="hidden sm:flex items-center gap-1">
          <button
            onClick={() => handleScroll('left')}
            disabled={!canScrollLeft}
            aria-label="Previous"
            className={arrowClass(canScrollLeft)}
          >
            <FiChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleScroll('right')}
            disabled={!canScrollRight}
            aria-label="Next"
            className={arrowClass(canScrollRight)}
          >
            <FiChevronRight className="w-4 h-4" />
          </button>
          </div>
        </div>
      </div>

      {/* Swipeable horizontal list showing cards */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex items-stretch gap-3.5 overflow-x-auto px-4 sm:px-5 pb-2 scrollbar-hide overscroll-x-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {serviceList.map((service, index) => (
          <BookedServiceCard
            key={service.id || service._id || index}
            service={service}
            onServiceClick={onServiceClick}
            onAddClick={onAddClick}
          />
        ))}
      </div>
    </section>
  );
});

MostBookedServices.displayName = 'MostBookedServices';

export default MostBookedServices;
