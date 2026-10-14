import React, { memo, useState } from 'react';
import { AiFillStar } from 'react-icons/ai';
import { optimizeCloudinaryUrl } from '../../../../utils/cloudinaryOptimize';

const formatPrice = (p) => {
  if (!p) return null;
  const clean = p.toString().replace(/[^0-9]/g, '');
  return clean ? new Intl.NumberFormat('en-IN').format(clean) : null;
};

// Ratings are typed in admin; show only a valid 0-5 number (e.g. "3.9M" -> "3.9")
const formatRating = (value) => {
  const num = parseFloat(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(num) || num <= 0 || num > 5) return null;
  return String(Math.round(num * 100) / 100);
};

// Urban Company style service tile: square image, 2-line title, rating, price + Add
const ServiceWithRatingCard = memo(({ image, fallbackImage, title, rating, reviews, price, originalPrice, discount, badge, optionsCount, onClick, onAddClick, tagClassName = 'bg-[#07794C]' }) => {
  const [failedSrc, setFailedSrc] = useState(null);

  const displayRating = formatRating(rating);
  const displayPrice = formatPrice(price);
  const displayOriginalPrice = formatPrice(originalPrice);
  const options = parseInt(optionsCount, 10) || 0;
  const hasOptions = options > 1;
  const tag = discount
    ? (discount.toString().toUpperCase().includes('OFF') ? discount : `${discount} OFF`)
    : badge;

  // Fall back to the local product image when the remote one is missing or fails to load
  const src = image && failedSrc !== image ? optimizeCloudinaryUrl(image, { width: 360, quality: 'auto', crop: 'fill' }) : fallbackImage;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick?.();
      }}
      className="w-[144px] sm:w-[158px] shrink-0 flex flex-col cursor-pointer group active:scale-[0.98] transition-transform duration-150 select-none"
    >
      {/* Image tile */}
      <div className="relative w-full aspect-square rounded-[18px] overflow-hidden bg-[#F5F5F7]">
        {src ? (
          <img
            src={src}
            alt={title}
            onError={() => image && setFailedSrc(image)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <img src="/helpu-logo.png" alt="" className="w-12 h-12 object-contain opacity-30 grayscale" />
          </div>
        )}
        {tag && (
          <span className={`absolute top-2 left-2 text-white text-[10px] font-bold px-1.5 py-0.5 rounded ${tagClassName}`}>
            {tag}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="mt-2.5 text-[14px] leading-[19px] font-medium text-[#18181B] line-clamp-2" title={title}>
        {title}
      </h3>

      {/* Rating */}
      {displayRating && (
        <div className="mt-1 flex items-center gap-1 text-[12.5px] leading-4">
          <AiFillStar className="w-3.5 h-3.5 text-[#27272A] shrink-0" />
          <span className="font-semibold text-[#18181B]">{displayRating}</span>
          {reviews && <span className="text-[#52525B]">({reviews})</span>}
        </div>
      )}

      {/* Price + Add */}
      <div className="mt-auto pt-2.5 flex items-center justify-between gap-1">
        <div className="flex flex-col justify-end min-w-0">
          {hasOptions && displayPrice && (
            <span className="text-[11px] leading-[14px] text-[#71717A]">Starts at</span>
          )}
          <div className="flex items-baseline gap-1 flex-wrap">
            {(displayPrice || price) && (
              <span className="text-[15px] sm:text-[16px] leading-5 font-bold text-[#18181B]">
                {displayPrice ? `₹${displayPrice}` : price}
              </span>
            )}
            {displayOriginalPrice && displayOriginalPrice !== displayPrice && (
              <span className="text-[11px] text-[#A1A1AA] line-through">₹{displayOriginalPrice}</span>
            )}
          </div>
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            aria-label={`Add ${title}`}
            onClick={(e) => {
              e.stopPropagation();
              onAddClick?.();
            }}
            className="w-[66px] h-[34px] rounded-[9px] bg-white border border-[#E4E4E7] shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-center justify-center transition-all duration-200 hover:border-[#6E42E5]/60 hover:bg-[#F9F7FD] active:scale-95"
          >
            <span className="text-[14px] font-bold text-[#6E42E5] tracking-tight">Add</span>
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

ServiceWithRatingCard.displayName = 'ServiceWithRatingCard';

export default ServiceWithRatingCard;
