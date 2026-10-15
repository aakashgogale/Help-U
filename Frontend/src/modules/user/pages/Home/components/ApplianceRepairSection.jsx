import React, { memo, useState, useRef, useEffect } from 'react';
import { AiFillStar } from 'react-icons/ai';
import { optimizeCloudinaryUrl } from '../../../../../utils/cloudinaryOptimize';

// High-resolution reference matching assets
import washingMachineImg from '../../../../../assets/images/pages/Home/ApplianceRepair/washing-machine-checkup.jpg';
import acRepairImg from '../../../../../assets/images/pages/Home/ApplianceRepair/ac-repair.jpg';
import waterPurifierImg from '../../../../../assets/images/pages/Home/ApplianceRepair/water-purifier-service.jpg';
import refrigeratorImg from '../../../../../assets/images/pages/Home/ApplianceRepair/refrigerator-repair.jpg';

// Helper to format price with Indian number grouping
const formatPrice = (p) => {
  if (p === null || p === undefined || p === '') return null;
  const clean = p.toString().replace(/[^0-9]/g, '');
  return clean ? new Intl.NumberFormat('en-IN').format(clean) : null;
};

// Map title keywords to local high-resolution matching assets
const getFallbackImageForTitle = (title) => {
  if (!title) return washingMachineImg;
  const t = title.toLowerCase();
  if (t.includes('washing') || t.includes('washer') || t.includes('laundry')) return washingMachineImg;
  if (t.includes('ac ') || t.includes('air conditioner') || t === 'ac' || t.includes('split ac')) return acRepairImg;
  if (t.includes('purifier') || t.includes('ro') || t.includes('r.o') || t.includes('water')) return waterPurifierImg;
  if (t.includes('refrigerator') || t.includes('fridge')) return refrigeratorImg;
  return washingMachineImg;
};

// Default reference services matching the provided screenshot exactly
const DEFAULT_APPLIANCE_SERVICES = [
  {
    id: 'appliance-card-1',
    title: 'Washing machine check-up',
    rating: '4.79',
    reviews: '103K',
    price: '199',
    optionsCount: 1,
    image: washingMachineImg,
    targetCategoryId: '69451ef01737849f56956257',
    slug: 'washing-machine'
  },
  {
    id: 'appliance-card-2',
    title: 'AC repair',
    rating: '4.73',
    reviews: '876K',
    price: '299',
    optionsCount: 4,
    image: acRepairImg,
    targetCategoryId: '69451ec71737849f5695624f',
    slug: 'ac'
  },
  {
    id: 'appliance-card-3',
    title: 'Water Purifier Service & Installation',
    rating: '4.80',
    reviews: '332K',
    price: '299',
    optionsCount: 6,
    image: waterPurifierImg,
    targetCategoryId: '69451f4e1737849f56956263',
    slug: 'ro-prufier'
  },
  {
    id: 'appliance-card-4',
    title: 'Refrigerator repair',
    rating: '4.76',
    reviews: '410K',
    price: '249',
    optionsCount: 3,
    image: refrigeratorImg,
    targetCategoryId: '69451edb1737849f56956253',
    slug: 'fridge'
  }
];

export const ApplianceServiceCard = memo(({ service, onServiceClick, onAddClick }) => {
  const [imageFailed, setImageFailed] = useState(false);

  const fallback = getFallbackImageForTitle(service.title);

  // Check if image is unrelated (e.g. electrical-panel) or empty
  const rawImage = service.image;
  const isSuspiciousImage = rawImage && (rawImage.includes('electrical-panel') || rawImage.includes('wiring'));

  let initialSrc = fallback;
  if (rawImage && !isSuspiciousImage && !imageFailed) {
    if (rawImage.startsWith('http')) {
      initialSrc = optimizeCloudinaryUrl(rawImage, { width: 360, quality: 'auto', crop: 'fill' });
    } else {
      initialSrc = rawImage;
    }
  }

  const title = service.title || 'Appliance Service';
  const rating = service.rating || '4.8';
  const reviews = service.reviews || '10k+';

  const rawOptions = parseInt(service.optionsCount, 10);
  const options = !isNaN(rawOptions) ? rawOptions : (
    title.toLowerCase().includes('ac') ? 4 :
    title.toLowerCase().includes('purifier') ? 6 :
    title.toLowerCase().includes('refrigerator') ? 3 : 1
  );
  const hasOptions = options > 1;

  const displayPrice = formatPrice(service.price) || service.price || '199';
  const displayOriginalPrice = formatPrice(service.originalPrice);

  return (
    <div
      onClick={() => onServiceClick?.(service)}
      className="w-[144px] sm:w-[158px] flex-shrink-0 flex flex-col cursor-pointer group active:scale-[0.98] transition-transform duration-150 select-none"
    >
      {/* Rounded-square image container with 18px radius */}
      <div className="relative w-full aspect-square rounded-[18px] overflow-hidden bg-[#F5F5F7]">
        <img
          src={imageFailed ? fallback : initialSrc}
          alt={title}
          onError={() => setImageFailed(true)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
        {service.discount && (
          <span className="absolute top-2 left-2 text-white text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#6E42E5]">
            {service.discount}
          </span>
        )}
      </div>

      {/* Service name (2 lines max with fixed height to preserve horizontal alignment) */}
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

      {/* Bottom row: Price (Starts at ₹...) & Outlined Purple Add button */}
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

ApplianceServiceCard.displayName = 'ApplianceServiceCard';

const ApplianceRepairSection = React.memo(({
  title = 'Appliance repair & service',
  subtitle,
  services,
  onSeeAllClick,
  onServiceClick,
  onAddClick
}) => {
  const cardsRef = useRef(null);

  // Use provided services or fall back to high-fidelity reference defaults
  const serviceList = (services && services.length > 0)
    ? services.map((s, idx) => ({
        ...s,
        id: s.id || s._id || `appliance-dyn-${idx}`,
        // Ensure image has high-res fallback if empty or broken
        image: s.image || getFallbackImageForTitle(s.title)
      }))
    : DEFAULT_APPLIANCE_SERVICES;

  return (
    <section className="w-full">
      {/* Section Header: Bold black title + outlined See all */}
      <div className="px-4 sm:px-5 mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[20px] sm:text-[22px] font-bold text-[#111827] tracking-tight leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[13px] text-[#71717A] mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {onSeeAllClick && (
          <button
            type="button"
            onClick={() => onSeeAllClick(serviceList)}
            className="shrink-0 h-8 px-3.5 rounded-lg border border-[#E3E3E3] bg-white text-[13px] font-semibold text-[#6E42E5] hover:border-[#6E42E5]/50 hover:bg-[#F9F7FD] active:scale-95 transition-all"
          >
            See all
          </button>
        )}
      </div>

      {/* Swipeable horizontal list showing cards */}
      <div
        ref={cardsRef}
        className="flex items-stretch gap-3.5 overflow-x-auto px-4 sm:px-5 pb-2 scrollbar-hide overscroll-x-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {serviceList.map((service) => (
          <ApplianceServiceCard
            key={service.id || service._id}
            service={service}
            onServiceClick={onServiceClick}
            onAddClick={onAddClick}
          />
        ))}
      </div>
    </section>
  );
});

ApplianceRepairSection.displayName = 'ApplianceRepairSection';

export default ApplianceRepairSection;
