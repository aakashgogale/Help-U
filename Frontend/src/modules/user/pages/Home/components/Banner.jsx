import React, { useState } from 'react';
import homepageBanner from '../../../../../assets/images/pages/Home/Banner/homepage-banner.png';
import { optimizeCloudinaryUrl } from '../../../../../utils/cloudinaryOptimize';

// Every banner renders at one fixed size (3:1), whatever size was uploaded from admin
const Banner = React.memo(({ imageUrl, onClick }) => {
  // Optimize Cloudinary URLs for faster loading
  const optimizedUrl = imageUrl ? optimizeCloudinaryUrl(imageUrl, { quality: 'auto' }) : homepageBanner;
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="px-4 sm:px-5 w-full lg:max-w-5xl lg:mx-auto cursor-pointer" onClick={onClick}>
      <div className="relative w-full aspect-3/1 rounded-[22px] sm:rounded-[26px] overflow-hidden transition-transform duration-300 active:scale-[0.99] bg-slate-100">
        {!loaded && <div className="absolute inset-0 bg-slate-100 animate-pulse" />}
        <img
          src={optimizedUrl}
          alt="Banner"
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
          decoding="async"
        />
      </div>
    </div>
  );
});

Banner.displayName = 'Banner';

export default Banner;
