import React, { useEffect, useState } from 'react';

// Bottom-centered white pill badge matching screenshot cleanly without overlapping artwork
const EtaBadge = ({ minutes }) => (
  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-white px-1.5 py-0.5 rounded-[6px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-emerald-100/90 pointer-events-none z-10 flex items-center justify-center">
    <span className="text-[10px] sm:text-[10.5px] font-bold text-[#0B7D5C] whitespace-nowrap leading-none tracking-tight">
      {minutes} mins
    </span>
  </div>
);

const CategoryTile = ({ title, icon, fallbackIcon, etaMinutes, isAvatar = false, onClick, compact = false }) => {
  const [currentSrc, setCurrentSrc] = useState(icon);
  const [triedFallback, setTriedFallback] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setCurrentSrc(icon);
    setTriedFallback(false);
    setImgError(false);
  }, [icon]);

  const handleImageError = () => {
    if (!triedFallback && fallbackIcon && fallbackIcon !== currentSrc) {
      setTriedFallback(true);
      setCurrentSrc(fallbackIcon);
    } else {
      setImgError(true);
    }
  };

  const hasEta = typeof etaMinutes === 'number' && etaMinutes > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center text-center w-full focus:outline-none group cursor-pointer"
    >
      <div className="relative w-full aspect-[1/0.92] sm:aspect-square rounded-[18px] sm:rounded-[20px] bg-gradient-to-b from-[#FAFBFD] to-[#F1F3F6] hover:from-[#F4F6F9] hover:to-[#EAECEF] overflow-hidden flex flex-col items-center justify-center transition-all duration-200 active:scale-[0.96] group shadow-[0_1px_3px_rgba(0,0,0,0.03)] border border-gray-100/90 hover:border-gray-200/90">
        <div className={`w-full flex-1 flex items-center justify-center overflow-hidden ${hasEta ? 'pt-1.5 pb-4 px-1.5' : 'p-2'}`}>
          {currentSrc && !imgError ? (
            <img
              src={currentSrc}
              alt={title}
              onError={handleImageError}
              className={`${
                isAvatar
                  ? 'max-h-[82%] max-w-[82%]'
                  : 'max-h-[78%] max-w-[78%]'
              } object-contain transition-transform duration-300 group-hover:scale-106 pointer-events-none select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.06)]`}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-blue-600 font-bold flex items-center justify-center text-sm shadow-xs border border-blue-100/50">
              {title ? title.charAt(0).toUpperCase() : '★'}
            </div>
          )}
        </div>
        {hasEta && <EtaBadge minutes={etaMinutes} />}
      </div>
      <div className="min-h-[28px] sm:min-h-[32px] flex items-start justify-center w-full mt-1.5 px-0.5">
        <span
          className={`font-semibold text-[#1F2937] leading-[1.2] text-center line-clamp-2 ${
            compact ? 'text-[11px] sm:text-[11.5px]' : 'text-[11.5px] sm:text-[12.5px]'
          }`}
        >
          {title}
        </span>
      </div>
    </button>
  );
};

export default CategoryTile;
