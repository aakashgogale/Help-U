import React, { memo, useState } from 'react';
import OptimizedVideo from '../../../../components/common/OptimizedVideo';
import { optimizeCloudinaryUrl } from '../../../../utils/cloudinaryOptimize';

// Every promo renders at one fixed size (2:1), whatever size was uploaded from admin
const PromoCard = memo(({ title, image, onClick, className = '', priority = false }) => {
  const [loaded, setLoaded] = useState(false);

  const isVideo = image && (
    image.includes('video/upload') ||
    image.match(/\.(mp4|webm|ogg|mov)$|^https:\/\/res\.cloudinary\.com.*\/video\//i)
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={title || 'Promotion'}
      className={`relative aspect-2/1 rounded-[22px] sm:rounded-[26px] overflow-hidden w-[calc(100vw-32px)] max-w-[560px] sm:w-[440px] md:w-[520px] cursor-pointer transition-transform duration-300 active:scale-[0.99] bg-slate-100 shrink-0 ${className}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {!loaded && image && <div className="absolute inset-0 bg-slate-100 animate-pulse" />}
      {image ? (
        isVideo ? (
          <OptimizedVideo
            src={image}
            className="absolute inset-0 w-full h-full"
            autoPlay
            loop
            muted
            playsInline
            onLoadedData={() => setLoaded(true)}
          />
        ) : (
          <img
            src={optimizeCloudinaryUrl(image, { width: 1040, crop: 'limit', quality: 'auto' })}
            alt={title || 'Promo'}
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        )
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <span className="text-gray-400 text-sm font-medium">Help U Banner</span>
        </div>
      )}
    </div>
  );
});

PromoCard.displayName = 'PromoCard';

export default PromoCard;
