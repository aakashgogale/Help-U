import React, { memo, useState, useRef, useEffect } from 'react';
import { AiFillStar } from 'react-icons/ai';
import { optimizeCloudinaryUrl } from '../../../../../utils/cloudinaryOptimize';

// Helper to format price with Indian number grouping
const formatPrice = (p) => {
  if (p === null || p === undefined || p === '') return null;
  const clean = p.toString().replace(/[^0-9]/g, '');
  return clean ? new Intl.NumberFormat('en-IN').format(clean) : null;
};

export const ApplianceServiceCard = memo(({ service, onServiceClick, onAddClick }) => {
  const [imageFailed, setImageFailed] = useState(false);

  // Everything shown comes from the admin's card (or the service it links to)
  const rawImage = service.image;
  const src = rawImage && !imageFailed
    ? (rawImage.startsWith('http') ? optimizeCloudinaryUrl(rawImage, { width: 360, quality: 'auto', crop: 'fill' }) : rawImage)
    : null;

  const title = service.title || 'Appliance Service';
  const rating = service.rating || '';
  const reviews = service.reviews || '';

  const rawOptions = parseInt(service.optionsCount, 10);
  const options = !isNaN(rawOptions) && rawOptions > 0 ? rawOptions : 1;
  const hasOptions = options > 1;

  const displayPrice = formatPrice(service.price);
  const displayOriginalPrice = formatPrice(service.originalPrice);

  return (
    <div
      onClick={() => onServiceClick?.(service)}
      className="w-[144px] sm:w-[158px] flex-shrink-0 flex flex-col cursor-pointer group active:scale-[0.98] transition-transform duration-150 select-none"
    >
      {/* Rounded-square image container with 18px radius */}
      <div className="relative w-full aspect-square rounded-[18px] overflow-hidden bg-[#F5F5F7]">
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
      {(rating || reviews) && (
        <div className="mt-1 flex items-center gap-1 text-[12.5px] leading-4 text-[#3F3F46]">
          {rating && (
            <>
              <AiFillStar className="w-3.5 h-3.5 text-[#27272A] flex-shrink-0" />
              <span className="font-semibold text-[#18181B]">{rating}</span>
            </>
          )}
          {reviews && (
            <span className="text-[#52525B]">({reviews})</span>
          )}
        </div>
      )}

      {/* Bottom row: Price (Starts at ₹...) & Outlined Purple Add button */}
      <div className="mt-auto pt-2.5 flex items-end justify-between gap-1">
        <div className="flex flex-col justify-end">
          {hasOptions && displayPrice && (
            <span className="text-[11px] leading-[14px] font-normal text-[#71717A]">
              Starts at
            </span>
          )}
          <div className="flex items-baseline gap-1">
            {displayPrice && (
              <span className="text-[15px] sm:text-[16px] leading-[20px] font-bold text-[#18181B]">
                ₹{displayPrice}
              </span>
            )}
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

  const serviceList = (services || []).filter(s => s && s.title).map((s, idx) => ({
    ...s,
    id: s.id || s._id || `appliance-${idx}`
  }));

  if (serviceList.length === 0) return null;

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
