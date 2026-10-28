import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FiGift,
  FiZap,
  FiPercent,
  FiShield,
  FiStar,
  FiTrendingUp,
  FiAward,
  FiClock,
  FiCheck,
  FiCopy,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import { toast } from 'react-hot-toast';
import { loginBannerPublicService } from '../../services/loginBannerService';

// Gradient presets mapping
const GRADIENT_MAP = {
  navy: 'from-[#163B66] via-[#1E4D82] to-[#0F2B48] text-white',
  emerald: 'from-[#065F46] via-[#059669] to-[#047857] text-white',
  amber: 'from-[#92400E] via-[#D97706] to-[#B45309] text-white',
  purple: 'from-[#5B21B6] via-[#7C3AED] to-[#4C1D95] text-white',
  rose: 'from-[#9F1239] via-[#E11D48] to-[#881337] text-white',
  blue: 'from-[#1E40AF] via-[#2563EB] to-[#1D4ED8] text-white',
  dark: 'from-[#0F172A] via-[#1E293B] to-[#334155] text-white'
};

const getIcon = (iconName, className = 'w-4 h-4') => {
  switch (iconName?.toLowerCase()) {
    case 'gift':
      return <FiGift className={className} />;
    case 'zap':
      return <FiZap className={className} />;
    case 'percent':
      return <FiPercent className={className} />;
    case 'shield':
      return <FiShield className={className} />;
    case 'star':
      return <FiStar className={className} />;
    case 'trending':
      return <FiTrendingUp className={className} />;
    case 'award':
      return <FiAward className={className} />;
    case 'clock':
      return <FiClock className={className} />;
    case 'check':
      return <FiCheck className={className} />;
    case 'sparkles':
    default:
      return <HiSparkles className={className} />;
  }
};

const FloatingLoginBanners = ({ app = 'user', className = '' }) => {
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);
  const [isPaused, setIsPaused] = useState(false);

  // Touch tracking for mobile swipe gestures
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);

  // Fetch banners on mount
  useEffect(() => {
    let isMounted = true;
    const fetchBanners = async () => {
      try {
        setIsLoading(true);
        const res = await loginBannerPublicService.getPublicBanners(app);
        if (isMounted) {
          if (res?.enabled === false) {
            setBanners([]);
          } else if (res?.banners?.length) {
            setBanners(res.banners);
          } else {
            setBanners([]);
          }
        }
      } catch (err) {
        console.warn('Error loading login banners:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchBanners();
    return () => {
      isMounted = false;
    };
  }, [app]);

  // Auto-slide effect
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [banners.length, isPaused]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  }, [banners.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartXRef.current || !touchEndXRef.current) return;
    const distance = touchStartXRef.current - touchEndXRef.current;
    const isLeftSwipe = distance > 40;
    const isRightSwipe = distance < -40;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }

    touchStartXRef.current = 0;
    touchEndXRef.current = 0;
  };

  const copyCode = (e, code) => {
    e.stopPropagation();
    if (!code) return;
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    toast.success(`Code "${code}" copied!`, {
      icon: '🎉',
      duration: 2500
    });
    setTimeout(() => setCopiedCode(null), 3000);
  };

  if (isLoading && banners.length === 0) {
    return (
      <div className={`w-full max-w-sm sm:max-w-md mx-auto px-4 mb-4 ${className}`}>
        <div className="h-24 sm:h-28 rounded-2xl bg-gradient-to-r from-slate-100 to-slate-200 animate-pulse border border-slate-100" />
      </div>
    );
  }

  if (!banners || banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex] || banners[0];
  const gradientClass = GRADIENT_MAP[currentBanner.gradient] || GRADIENT_MAP.navy;

  return (
    <div
      className={`w-full max-w-sm sm:max-w-md mx-auto relative px-2 sm:px-4 my-2.5 z-20 ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Floating Card Outer Wrapper */}
      <div className="relative group overflow-hidden rounded-2xl sm:rounded-3xl shadow-[0_8px_25px_-5px_rgba(22,59,102,0.14),0_2px_8px_-2px_rgba(0,0,0,0.06)] border border-slate-200/60 transition-all duration-300 hover:shadow-[0_12px_30px_-5px_rgba(22,59,102,0.22)]">
        {/* Banner with Image */}
        {currentBanner.imageUrl ? (
          <div className="relative w-full h-24 sm:h-28 bg-slate-900 overflow-hidden">
            <img
              src={currentBanner.imageUrl}
              alt={currentBanner.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Dark gradient overlay for text readability if title is present */}
            {(currentBanner.title || currentBanner.badge) && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  {currentBanner.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider border border-white/20">
                      {currentBanner.badge}
                    </span>
                  )}
                  {currentBanner.offerCode && (
                    <button
                      type="button"
                      onClick={(e) => copyCode(e, currentBanner.offerCode)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold shadow-sm active:scale-95 transition-transform"
                    >
                      {copiedCode === currentBanner.offerCode ? <FiCheck className="w-2.5 h-2.5" /> : <FiCopy className="w-2.5 h-2.5" />}
                      <span>{currentBanner.offerCode}</span>
                    </button>
                  )}
                </div>
                <h3 className="text-white text-xs sm:text-sm font-bold line-clamp-1 drop-shadow-sm">
                  {currentBanner.title}
                </h3>
                {currentBanner.subtitle && (
                  <p className="text-white/80 text-[11px] line-clamp-1 drop-shadow-sm">
                    {currentBanner.subtitle}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Rich Gradient Floating Banner Card */
          <div
            className={`relative w-full min-h-[92px] sm:min-h-[102px] p-3 sm:p-3.5 bg-gradient-to-r ${gradientClass} flex flex-col justify-between overflow-hidden`}
          >
            {/* Ambient Background Glow Effect */}
            <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-black/10 blur-lg pointer-events-none" />

            {/* Top row: Badge, Icon, & Offer Code */}
            <div className="relative z-10 flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {currentBanner.badge && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] sm:text-[11px] font-bold tracking-wide uppercase border border-white/20 shadow-sm">
                    {getIcon(currentBanner.icon, 'w-3 h-3 text-amber-300')}
                    <span>{currentBanner.badge}</span>
                  </span>
                )}
              </div>

              {currentBanner.offerCode && (
                <button
                  type="button"
                  onClick={(e) => copyCode(e, currentBanner.offerCode)}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white text-slate-900 text-[10px] sm:text-[11px] font-bold shadow-md hover:bg-amber-300 active:scale-95 transition-all cursor-pointer group/btn"
                  title="Click to copy code"
                >
                  {copiedCode === currentBanner.offerCode ? (
                    <>
                      <FiCheck className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <span className="text-slate-500 font-medium text-[9px] uppercase">Code:</span>
                      <span className="font-extrabold tracking-wide">{currentBanner.offerCode}</span>
                      <FiCopy className="w-2.5 h-2.5 text-slate-400 group-hover/btn:text-slate-800 transition-colors" />
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Middle: Title & Subtitle */}
            <div className="relative z-10 pr-2">
              <h3 className="text-white text-[13px] sm:text-[14px] font-bold leading-snug tracking-tight drop-shadow-sm line-clamp-1">
                {currentBanner.title}
              </h3>
              {currentBanner.subtitle && (
                <p className="mt-0.5 text-white/85 text-[11px] sm:text-[12px] font-medium leading-tight line-clamp-1 drop-shadow-sm">
                  {currentBanner.subtitle}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Carousel Navigation Arrows (Desktop hover / discreet) */}
        {banners.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous Banner"
              className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/30 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm z-30"
            >
              <FiChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next Banner"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/30 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm z-30"
            >
              <FiChevronRight className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {/* Bottom Pagination Dots */}
        {banners.length > 1 && (
          <div className="absolute bottom-1.5 left-0 right-0 flex items-center justify-center gap-1.5 z-20 pointer-events-none">
            {banners.map((_, idx) => (
              <span
                key={idx}
                className={`transition-all duration-300 rounded-full h-1.5 ${
                  idx === currentIndex
                    ? 'w-4 bg-white shadow-sm'
                    : 'w-1.5 bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingLoginBanners;

