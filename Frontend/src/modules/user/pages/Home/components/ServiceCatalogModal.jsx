import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiArrowLeft,
  FiSearch,
  FiShare2,
  FiStar,
  FiPercent,
  FiMenu,
  FiChevronDown,
  FiPlus,
  FiMinus,
  FiCheck,
  FiX,
  FiBookmark,
  FiInfo,
  FiZap,
  FiShield,
  FiAlertCircle,
  FiClock,
  FiHelpCircle
} from 'react-icons/fi';
import { useCart } from '../../../../../context/CartContext';
import ServiceOptionsSheet from './ServiceOptionsSheet';
import useBookingConfig from '../../../../../hooks/useBookingConfig';
import { policySummaryLine } from '../../../../../components/common/legal/cancellationPolicyModel';
import CategoryTile from '../../../components/common/CategoryTile';
import { publicCatalogService } from '../../../../../services/catalogService';
import { getCategoryIllustration } from '../../../utils/categoryIcons';
import { toast } from 'react-hot-toast';
import ModalLock from '../../../../../components/common/ModalLock';

// Helper to sanitize asset URLs
const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = url.replace('/api/upload', '/upload');
  if (
    clean.startsWith('http') ||
    clean.startsWith('/categories') ||
    clean.startsWith('/ServiceIcon') ||
    clean.startsWith('/services') ||
    clean.startsWith('/noteworthy') ||
    clean.startsWith('/spotlight') ||
    clean.startsWith('/cleaning-essentials') ||
    clean.startsWith('/appliance') ||
    clean.startsWith('/')
  ) {
    return clean;
  }
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

// Image with automatic fallback so broken image icons never appear.
const ImageWithFallback = ({ src, alt, className, fallback }) => {
  const [imgSrc, setImgSrc] = useState(src || fallback);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImgSrc(src || fallback);
    setHasError(false);
  }, [src, fallback]);

  return (
    <img
      src={imgSrc || fallback}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        if (!hasError && fallback && imgSrc !== fallback) {
          setHasError(true);
          setImgSrc(fallback);
        }
      }}
    />
  );
};

// =========================================================================
// Category Matcher Helper
// =========================================================================
const resolveCategoryKey = (categoryOrService) => {
  if (!categoryOrService) return null;
  const slug = (categoryOrService.slug || '').toLowerCase().trim();
  const title = (categoryOrService.title || categoryOrService.name || '').toLowerCase().trim();
  const text = `${slug} ${title} ${categoryOrService.id || ''}`.replace(/[^a-z0-9]+/g, ' ');

  // 1. SPECIFIC SUB-SERVICE MATCHES FIRST (When clicked from home cards or direct search)
  // Painting
  if (text.includes('paint') || text.includes('waterproof') || text.includes('colour') || text.includes('color')) {
    return 'painting';
  }

  // Nail Art
  if (text.includes('nail')) {
    return 'nail-art-extensions';
  }

  // Water Tank
  if (text.includes('tank')) {
    return 'water-tank-cleaning';
  }

  // Car Wash
  if (text.includes('car wash') || text.includes('car-wash') || text.includes('car clean') || (/\bcar\b/.test(text) && !text.includes('carpet') && !text.includes('carpent'))) {
    return 'car-wash-at-home';
  }

  // CCTV
  if (text.includes('cctv') || text.includes('security') || text.includes('surveillance') || text.includes('camera')) {
    return 'cctv-services';
  }

  // Fan
  if (text.includes('fan')) return 'fan-repair';

  // Wiring & circuits
  if (text.includes('wiring') || text.includes('short circuit') || text.includes('earthing')) return 'home-wiring';

  // Inverter
  if (text.includes('inverter') || text.includes('invertor')) return 'inverter';

  // MCB & DB box
  if (text.includes('mcb') || text.includes('sub meter') || text.includes('submeter') || text.includes('changeover')) return 'mcb';

  // Switch & socket
  if (text.includes('switch') || text.includes('socket')) return 'switches-sockets';

  // Water heater / Geyser
  if (text.includes('geyser') || text.includes('water heater')) return 'geyser';

  // Room heater
  if (text.includes('heater') || text.includes('blower') || text.includes('radiator') || text.includes('ofr')) return 'room-heater';

  // Tap repair
  if (text.includes('tap') || text.includes('faucet')) return 'tap-repair';

  // Specific cleaning
  if (text.includes('sofa') || text.includes('couch')) return 'sofa-cleaning';
  if (text.includes('bathroom') || text.includes('toilet') || text.includes('washbasin')) return 'bathroom-cleaning';
  if (text.includes('kitchen') || text.includes('chimney')) return 'kitchen-cleaning';

  // Specific Salon
  if (text.includes('threading')) return 'threading';
  if (text.includes('wax') || text.includes('spatula')) return 'waxing';

  // Specific Appliances
  if (text.includes('microwave') || text.includes('micro wave') || text.includes('micro-wave')) return 'microwave';
  if (text.includes('fridge') || text.includes('refrigerator')) return 'refrigerator';
  if (text.includes('purifier') || text.includes('ro prufier') || text.includes('ro purifier')) return 'water-purifier';
  if (text.includes('washing machine') || text.includes('wash machine')) return 'washing-machine';
  if (text.includes('ac') || text.includes('air condition') || text.includes('cooler')) return 'ac-repair';

  // 2. BROAD CATEGORY LEVEL FALLBACKS (When clicking top category grid tiles)
  // Men's Salon
  if (
    text.includes('men') ||
    text.includes('male') ||
    text.includes('boy') ||
    text.includes('barber') ||
    text.includes('groom') ||
    text.includes('beard') ||
    text.includes('shave')
  ) {
    return 'mens-salon';
  }

  // Women's Salon
  if (
    text.includes('women') ||
    text.includes('female') ||
    text.includes('girl') ||
    text.includes('salon-luxe') ||
    text.includes('salon') ||
    text.includes('facial') ||
    text.includes('spa') ||
    text.includes('hair-studio') ||
    text.includes('pedicure') ||
    text.includes('manicure')
  ) {
    return 'womens-salon';
  }

  // General Plumber
  if (text.includes('plumb') || text.includes('pipe') || text.includes('drain') || text.includes('motor')) {
    return 'plumber';
  }

  // General Carpenter
  if (text.includes('carpent') || text.includes('door') || text.includes('lock') || text.includes('furniture') || text.includes('assembly')) {
    return 'carpenter';
  }

  // General Electrician
  if (text.includes('electric') || text.includes('fuse') || text.includes('light') || text.includes('bulb')) {
    return 'electrician-services';
  }

  // General Cleaning
  if (text.includes('clean') || text.includes('pest')) {
    return 'cleaning';
  }

  return null;
};

const EMPTY_CATALOG = { sections: [], subCategories: [] };

// Contextual fallback image resolver matching the exact category & service topic
const resolveServiceImage = (item, category, categoryTitle) => {
  const catTitle = `${category?.title || ''} ${categoryTitle || ''} ${category?.slug || ''}`.toLowerCase();
  const itemTitle = `${item?.title || ''} ${item?.name || ''}`.toLowerCase();

  const isMenCategory =
    catTitle.includes('men') ||
    catTitle.includes('barber') ||
    catTitle.includes('groom') ||
    catTitle.includes('male');

  const isWomenCategory =
    (catTitle.includes('women') || catTitle.includes('female') || catTitle.includes('girl')) ||
    (!isMenCategory && (catTitle.includes('salon') || catTitle.includes('spa') || catTitle.includes('beauty')));

  const isCleaningCategory =
    catTitle.includes('clean') || catTitle.includes('pest') || catTitle.includes('washroom') || catTitle.includes('kitech');

  const isApplianceCategory =
    catTitle.includes('appliance') || catTitle.includes('ac ') || catTitle === 'ac' ||
    catTitle.includes('fridge') || catTitle.includes('refrigerator') ||
    catTitle.includes('washing') || catTitle.includes('purifier') || catTitle.includes('prufier') ||
    catTitle.includes('cooler') || catTitle.includes('geyser') || catTitle.includes('chimney') ||
    catTitle.includes('microwave') || catTitle.includes('dish') || catTitle.includes('tv') || catTitle.includes('led');

  const isPlumberCategory =
    catTitle.includes('plumb') || catTitle.includes('tap') || catTitle.includes('pipe') || catTitle.includes('drain');

  const isCarpenterCategory =
    catTitle.includes('carpent') || catTitle.includes('door') || catTitle.includes('furniture') || catTitle.includes('assembly');

  const isElectricianCategory =
    catTitle.includes('electric') || catTitle.includes('wiring') || catTitle.includes('switch') || catTitle.includes('socket') || catTitle.includes('fan');

  // Helper: check if a candidate image url belongs to the current category and is not cross-contaminating
  const isImageValidForCategory = (url) => {
    if (!url || typeof url !== 'string') return false;
    const u = url.toLowerCase();
    if (u.includes('placeholder') || u.includes('default')) return false;

    // Strict cross-contamination filters:
    if (isMenCategory) {
      if (u.includes('switch-socket') || u.includes('electrician') || u.includes('plumber') || u.includes('carpenter') || u.includes('womens-salon') || u.includes('cleaning')) {
        return false;
      }
    }
    if (isWomenCategory) {
      if (u.includes('switch-socket') || u.includes('electrician') || u.includes('plumber') || u.includes('mens-salon')) {
        return false;
      }
    }
    if (isCleaningCategory) {
      if (u.includes('switch-socket') || u.includes('electrician') || u.includes('salon') || u.includes('mens-salon')) {
        return false;
      }
    }
    if (isApplianceCategory && !isElectricianCategory) {
      if (u.includes('switch-socket') && !itemTitle.includes('switch') && !itemTitle.includes('socket')) {
        return false;
      }
    }
    return true;
  };

  // 1. Direct item image if valid for this category
  if (item?.image && isImageValidForCategory(item.image)) return toAssetUrl(item.image);
  if (Array.isArray(item?.images) && item.images.length > 0 && isImageValidForCategory(item.images[0])) {
    return toAssetUrl(item.images[0]);
  }
  if (item?.iconUrl && isImageValidForCategory(item.iconUrl)) return toAssetUrl(item.iconUrl);
  if (item?.icon && isImageValidForCategory(item.icon)) return toAssetUrl(item.icon);

  // 2. DOMAIN-SPECIFIC FALLBACKS (Zero cross-contamination guaranteed)

  // === MEN'S SALON & GROOMING ===
  if (isMenCategory) {
    if (itemTitle.includes('massage') || itemTitle.includes('pain') || itemTitle.includes('tissue') || itemTitle.includes('relief')) {
      return '/services/mens-salon/massage.jpg';
    }
    if (itemTitle.includes('detan') || itemTitle.includes('facial') || itemTitle.includes('tan') || itemTitle.includes('scrub') || itemTitle.includes('cleanup') || itemTitle.includes('face')) {
      return '/services/mens-salon/detan-facial.jpg';
    }
    if (itemTitle.includes('beard') || itemTitle.includes('shave') || itemTitle.includes('trim') || itemTitle.includes('mustache')) {
      return '/services/mens-salon/beard.jpg';
    }
    if (itemTitle.includes('package') || itemTitle.includes('combo') || itemTitle.includes('makeover') || itemTitle.includes('saver')) {
      return '/services/mens-salon/super-saver.jpg';
    }
    return '/services/mens-salon/haircut.jpg';
  }

  // === WOMEN'S SALON & SPA ===
  if (isWomenCategory) {
    if (itemTitle.includes('wax')) return '/services/spatula-waxing.jpg';
    if (itemTitle.includes('thread') || itemTitle.includes('eyebrow')) return '/services/threading.jpg';
    if (itemTitle.includes('mani') || itemTitle.includes('pedi') || itemTitle.includes('nail')) return '/categories/spa-women.svg';
    if (itemTitle.includes('glow') || itemTitle.includes('korean') || itemTitle.includes('japanese') || itemTitle.includes('ritual') || itemTitle.includes('gold')) {
      return '/services/hair-studio-facial.jpg';
    }
    if (itemTitle.includes('facial') || itemTitle.includes('cleanup') || itemTitle.includes('detan')) {
      return '/services/signature-facial.jpg';
    }
    if (itemTitle.includes('package') || itemTitle.includes('saver') || itemTitle.includes('combo')) {
      return '/noteworthy/salon-luxe.jpg';
    }
    return '/services/signature-facial.jpg';
  }

  // === CLEANING & PEST CONTROL ===
  if (isCleaningCategory) {
    if (itemTitle.includes('kitchen') || itemTitle.includes('chimney') || itemTitle.includes('stove') || itemTitle.includes('kitech')) {
      return '/cleaning/kitchen-deep-cleaning.jpg';
    }
    if (itemTitle.includes('sofa') || itemTitle.includes('couch') || itemTitle.includes('cushion') || itemTitle.includes('carpet') || itemTitle.includes('mattress')) {
      return '/cleaning/sofa-cleaning.jpg';
    }
    if (itemTitle.includes('bathroom') || itemTitle.includes('toilet') || itemTitle.includes('washroom') || itemTitle.includes('sink')) {
      return '/cleaning-essentials/intense-bathroom.jpg';
    }
    return '/cleaning-essentials/intense-bathroom.jpg';
  }

  // === APPLIANCE REPAIR & SERVICE ===
  if (isApplianceCategory) {
    if (itemTitle.includes('washing') || catTitle.includes('washing')) return '/appliance/washing-machine-checkup.jpg';
    if (itemTitle.includes('fridge') || itemTitle.includes('refrigerator') || catTitle.includes('fridge') || catTitle.includes('refrigerator')) return '/appliance/refrigerator-repair.jpg';
    if (itemTitle.includes('purifier') || itemTitle.includes('ro') || catTitle.includes('purifier') || catTitle.includes('prufier')) return '/appliance/water-purifier-service.jpg';
    if (itemTitle.includes('geyser') || itemTitle.includes('water heater') || catTitle.includes('geyser')) return '/services/geyser-repair.jpg';
    if (itemTitle.includes('chimney') || catTitle.includes('chimney')) return '/ServiceIcon/chimney.svg';
    if (itemTitle.includes('cooler') || catTitle.includes('cooler')) return '/services/cooler-repair.jpg';
    if (itemTitle.includes('microwave') || catTitle.includes('microwave')) return '/appliance/microwave-repair.jpg';
    if (itemTitle.includes('dish') || catTitle.includes('dish')) return '/ServiceIcon/dishwasher.svg';
    if (itemTitle.includes('led') || itemTitle.includes('tv') || catTitle.includes('led')) return '/ServiceIcon/led-tv.svg';
    return '/appliance/ac-repair.jpg';
  }

  // === PLUMBER ===
  if (isPlumberCategory) {
    if (itemTitle.includes('tap') || itemTitle.includes('faucet')) return '/services/tap-repair.jpg';
    return '/categories/plumber-toilet.svg';
  }

  // === CARPENTER & FURNITURE ===
  if (isCarpenterCategory) {
    if (itemTitle.includes('furniture') || itemTitle.includes('assembly') || itemTitle.includes('table') || itemTitle.includes('bed')) {
      return '/categories/furniture-assembly.svg';
    }
    return '/categories/carpenter-door.svg';
  }

  // === ELECTRICIAN & ELECTRICAL ===
  if (isElectricianCategory) {
    if (itemTitle.includes('fan')) return '/services/fan-repair.jpg';
    if (itemTitle.includes('wiring') || itemTitle.includes('circuit') || itemTitle.includes('short') || itemTitle.includes('earthing')) return '/services/electrical/home-wiring.jpg';
    if (itemTitle.includes('inverter') || itemTitle.includes('battery')) return '/services/electrical/inverter.jpg';
    if (itemTitle.includes('mcb') || itemTitle.includes('fuse') || itemTitle.includes('meter') || itemTitle.includes('changeover')) return '/services/electrical/mcb.jpg';
    if (itemTitle.includes('switch') || itemTitle.includes('socket') || itemTitle.includes('board') || itemTitle.includes('plug')) return '/services/switch-socket.jpg';
    return '/categories/electrician-switch.svg';
  }

  // === PAINTING ===
  if (catTitle.includes('paint') || itemTitle.includes('paint') || catTitle.includes('waterproof')) {
    return '/categories/painting.png';
  }

  // === VEHICLE WASHING ===
  if (itemTitle.includes('bike') || catTitle.includes('bike')) {
    return '/categories/bike-wash.png';
  }
  if (catTitle.includes('vehicle') || catTitle.includes('car wash') || itemTitle.includes('car wash') || (catTitle.includes('car') && catTitle.includes('wash'))) {
    return '/categories/vehicle-washing.png';
  }

  // === NAIL ART ===
  if (catTitle.includes('nail') || itemTitle.includes('nail')) {
    return '/categories/nail-art.png';
  }

  // === CCTV ===
  if (catTitle.includes('cctv') || itemTitle.includes('cctv') || catTitle.includes('surveillance')) {
    return '/categories/cctv.png';
  }

  // === WATER TANK ===
  if (catTitle.includes('tank') || itemTitle.includes('tank')) {
    return '/categories/water-tank.png';
  }

  // Fallbacks if category has an image
  if (category?.imageUrl && isImageValidForCategory(category.imageUrl)) return toAssetUrl(category.imageUrl);
  if (category?.image && isImageValidForCategory(category.image)) return toAssetUrl(category.image);

  return '/categories/all-services.svg';
};

// =========================================================================
// ServiceCatalogModal Component
// =========================================================================
const ServiceCatalogModal = React.memo(({
  isOpen,
  onClose,
  asPage = false,
  category,
  currentCity,
  location: userAddress,
  zoneId
}) => {
  const navigate = useNavigate();
  const { cartItems, addToCart, updateItem, removeItem } = useCart();
  const bookingConfig = useBookingConfig(); // the live cancellation policy shown on service pages
  const [optionsRequest, setOptionsRequest] = useState(null); // the option sheet, when a service has questions

  const [activeSubTab, setActiveSubTab] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedItemDetails, setSelectedItemDetails] = useState(null);
  const [selectedItemForVariants, setSelectedItemForVariants] = useState(null);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [backendServices, setBackendServices] = useState([]);
  const [catalogData, setCatalogData] = useState(null);
  const [addingId, setAddingId] = useState(null);
  const [expandedFaqIndex, setExpandedFaqIndex] = useState(null);

  const sectionRefs = useRef({});
  const catalogScrollRef = useRef(null);
  const galleryTouchStartX = useRef(null);

  // Smooth scroll to a section
  const scrollToSection = useCallback((sectionId) => {
    setActiveSubTab(sectionId);
    const el = sectionRefs.current[sectionId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setIsMenuOpen(false);
  }, []);

  // Determine active catalog dataset
  const catalogKey = useMemo(() => resolveCategoryKey(category), [category]);

  const catalogConfig = useMemo(() => {
    const base = EMPTY_CATALOG;
    const cat = catalogData?.category || category || {};
    return {
      ...base,
      title: cat.title || category?.title || '',
      etaMinutes: cat.etaDefaultMinutes || category?.etaMinutes || category?.etaDefaultMinutes || base.etaMinutes || 30,
      // Admin-entered values only; nothing is invented when they are empty
      rating: cat.displayRating || category?.displayRating || '',
      bookings: cat.bookingsLabel || category?.bookingsLabel || cat.reviewsLabel || '',
      hero: (() => {
        const rawHero = (cat.heroBanner?.title ? cat.heroBanner : null) || (catalogData?.hero?.title ? catalogData.hero : null);
        if (!rawHero) return null;
        return {
          ...rawHero,
          image: rawHero.image || rawHero.imageUrl || (catalogKey === 'microwave' ? '/appliance/microwave-repair.jpg' : '')
        };
      })(),
      coupon: (() => {
        if (catalogData?.bestCoupon?.code) {
          const c = catalogData.bestCoupon;
          return {
            title: c.title || c.code || (c.discount ? `Save ${c.discount}` : 'Special Offer'),
            subtitle: c.subtitle || c.description || (c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`),
            code: c.code
          };
        }
        return null;
      })(),
      subCategories: (catalogData?.subCategories && catalogData.subCategories.length > 0)
        ? catalogData.subCategories.map(sc => ({
            id: sc._id || sc.slug,
            title: sc.title,
            icon: sc.icon || sc.homeIconUrl
          }))
        : [],
      sections: []
    };
  }, [catalogData, category, catalogKey]);

  const categoryTitle = category?.title || catalogConfig.title;

  // Group backend services by brand / section
  const liveSections = useMemo(() => {
    if (!backendServices || backendServices.length === 0) return [];

    const groups = new Map();
    backendServices.forEach((s) => {
      const brandTitle = s.brandName || s.categoryName || 'Services';
      const brandSlug = `section-${String(brandTitle).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

      if (!groups.has(brandSlug)) {
        groups.set(brandSlug, {
          id: brandSlug,
          title: brandTitle,
          icon: s.brandIcon || s.iconUrl || s.icon || (Array.isArray(s.images) && s.images[0]) || null,
          items: []
        });
      }

      const itemPrice = Number(s.basePrice ?? s.price ?? s.amount ?? 499);
      const itemOriginalPrice = s.originalPrice ? Number(s.originalPrice) : undefined;
      const durationStr = s.durationMinutes ? `${s.durationMinutes} mins` : (s.duration ? `${s.duration} mins` : '45 mins');

      const serviceImages = Array.isArray(s.images) && s.images.length > 0
        ? s.images.map(toAssetUrl)
        : (s.iconUrl ? [toAssetUrl(s.iconUrl)] : (s.icon ? [toAssetUrl(s.icon)] : []));

      groups.get(brandSlug).items.push({
        id: s._id || s.id,
        isBackendService: true,
        backendServiceId: s._id || s.id,
        title: s.title || s.name,
        price: itemPrice,
        originalPrice: itemOriginalPrice,
        discount: s.discountLabel || (itemOriginalPrice && itemPrice ? `${Math.round(((itemOriginalPrice - itemPrice) / itemOriginalPrice) * 100)}% OFF` : null),
        // The admin's display rating/reviews (Service Wizard); empty means the card shows none
        rating: s.displayRating ? String(s.displayRating) : (s.rating ? String(s.rating) : ''),
        reviews: s.reviewsLabel || (s.reviewsCount ? `${s.reviewsCount} reviews` : (s.reviews || '')),
        duration: durationStr,
        image: s.images?.[0] ? toAssetUrl(s.images[0]) : (s.iconUrl ? toAssetUrl(s.iconUrl) : (s.icon ? toAssetUrl(s.icon) : null)),
        images: serviceImages,
        isPackage: Boolean(s.isPackage),
        variants: s.variants || [],
        inclusions: Array.isArray(s.inclusions) ? s.inclusions : [],
        exclusions: Array.isArray(s.exclusions) ? s.exclusions : [],
        faqs: Array.isArray(s.faqs) ? s.faqs : [],
        detailFields: Array.isArray(s.detailFields) ? s.detailFields : [],
        warranty: s.warranty || '',
        cancellationPolicy: s.cancellationPolicy || '',
        bullets: Array.isArray(s.inclusions) && s.inclusions.length > 0
          ? s.inclusions
          : (Array.isArray(s.features) && s.features.length > 0
            ? s.features
            : [s.description || 'Verified expert service with warranty']),
        description: s.description || ''
      });
    });

    let result = Array.from(groups.values());

    // Domain isolation based on active catalogKey
    if (catalogKey === 'fan-repair') {
      result = result.map(sec => {
        const filtered = (sec.items || []).filter(item => (item.title || '').toLowerCase().includes('fan'));
        return filtered.length > 0 ? { ...sec, items: filtered } : null;
      }).filter(Boolean);
    } else if (catalogKey === 'home-wiring') {
      result = result.map(sec => {
        const filtered = (sec.items || []).filter(item => {
          const t = (item.title || '').toLowerCase();
          return t.includes('wire') || t.includes('circuit') || t.includes('earth');
        });
        return filtered.length > 0 ? { ...sec, items: filtered } : null;
      }).filter(Boolean);
    } else if (catalogKey === 'inverter') {
      result = result.map(sec => {
        const filtered = (sec.items || []).filter(item => {
          const t = (item.title || '').toLowerCase();
          return t.includes('invert') || t.includes('battery');
        });
        return filtered.length > 0 ? { ...sec, items: filtered } : null;
      }).filter(Boolean);
    } else if (catalogKey === 'mcb') {
      result = result.map(sec => {
        const filtered = (sec.items || []).filter(item => {
          const t = (item.title || '').toLowerCase();
          return t.includes('mcb') || t.includes('fuse') || t.includes('meter') || t.includes('changeover');
        });
        return filtered.length > 0 ? { ...sec, items: filtered } : null;
      }).filter(Boolean);
    } else if (catalogKey === 'switches-sockets') {
      result = result.map(sec => {
        const filtered = (sec.items || []).filter(item => {
          const t = (item.title || '').toLowerCase();
          return t.includes('switch') || t.includes('socket');
        });
        return filtered.length > 0 ? { ...sec, items: filtered } : null;
      }).filter(Boolean);
    } else if (catalogKey === 'tap-repair') {
      result = result.map(sec => {
        const filtered = (sec.items || []).filter(item => {
          const t = (item.title || '').toLowerCase();
          return t.includes('tap') || t.includes('faucet') || t.includes('valve') || t.includes('leak');
        });
        return filtered.length > 0 ? { ...sec, items: filtered } : null;
      }).filter(Boolean);
    } else if (catalogKey === 'geyser') {
      result = result.map(sec => {
        const filtered = (sec.items || []).filter(item => {
          const t = (item.title || '').toLowerCase();
          return t.includes('geyser') || t.includes('water heater') || t.includes('heater');
        });
        return filtered.length > 0 ? { ...sec, items: filtered } : null;
      }).filter(Boolean);
    } else if (catalogKey === 'room-heater') {
      result = result.map(sec => {
        const filtered = (sec.items || []).filter(item => {
          const t = (item.title || '').toLowerCase();
          return t.includes('heater') || t.includes('blower') || t.includes('radiator') || t.includes('ofr');
        });
        return filtered.length > 0 ? { ...sec, items: filtered } : null;
      }).filter(Boolean);
    } else if (catalogKey === 'bathroom-cleaning') {
      result = result.map(sec => {
        const filtered = (sec.items || []).filter(item => {
          const t = (item.title || '').toLowerCase();
          return t.includes('bath') || t.includes('toilet') || t.includes('washbasin');
        });
        return filtered.length > 0 ? { ...sec, items: filtered } : null;
      }).filter(Boolean);
    } else if (catalogKey === 'sofa-cleaning') {
      result = result.map(sec => {
        const filtered = (sec.items || []).filter(item => {
          const t = (item.title || '').toLowerCase();
          return t.includes('sofa') || t.includes('couch') || t.includes('cushion');
        });
        return filtered.length > 0 ? { ...sec, items: filtered } : null;
      }).filter(Boolean);
    } else if (catalogKey === 'kitchen-cleaning') {
      result = result.map(sec => {
        const filtered = (sec.items || []).filter(item => {
          const t = (item.title || '').toLowerCase();
          return t.includes('kitchen') || t.includes('chimney') || t.includes('stove');
        });
        return filtered.length > 0 ? { ...sec, items: filtered } : null;
      }).filter(Boolean);
    } else if (catalogKey === 'threading') {
      result = result.map(sec => {
        const filtered = (sec.items || []).filter(item => (item.title || '').toLowerCase().includes('thread'));
        return filtered.length > 0 ? { ...sec, items: filtered } : null;
      }).filter(Boolean);
    } else if (catalogKey === 'waxing') {
      result = result.map(sec => {
        const filtered = (sec.items || []).filter(item => (item.title || '').toLowerCase().includes('wax'));
        return filtered.length > 0 ? { ...sec, items: filtered } : null;
      }).filter(Boolean);
    } else if (catalogKey === 'refrigerator') {
      result = result.map(sec => {
        const filtered = (sec.items || []).filter(item => {
          const t = (item.title || '').toLowerCase();
          return t.includes('fridge') || t.includes('refrigerator');
        });
        return filtered.length > 0 ? { ...sec, items: filtered } : null;
      }).filter(Boolean);
    } else if (catalogKey === 'electrician-services') {
      result = result
        .map(sec => {
          const secTitle = (sec.title || '').toLowerCase();
          if (secTitle.includes('plumb') || secTitle.includes('carpent') || secTitle.includes('furniture') || secTitle.includes('assembly')) {
            return null;
          }
          const filteredItems = (sec.items || []).filter(item => {
            const it = (item.title || '').toLowerCase();
            return !it.includes('tap') && !it.includes('pipe') && !it.includes('plumb') && !it.includes('toilet') && !it.includes('door') && !it.includes('carpent');
          });
          return filteredItems.length > 0 ? { ...sec, items: filteredItems } : null;
        })
        .filter(Boolean);
    } else if (catalogKey === 'plumber') {
      result = result
        .map(sec => {
          const secTitle = (sec.title || '').toLowerCase();
          const filteredItems = (sec.items || []).filter(item => {
            const it = (item.title || '').toLowerCase();
            return it.includes('tap') || it.includes('pipe') || it.includes('plumb') || it.includes('toilet') || it.includes('drain') || it.includes('leak') || it.includes('basin') || it.includes('sink');
          });
          return (secTitle.includes('plumb') || filteredItems.length > 0) ? { ...sec, items: filteredItems.length > 0 ? filteredItems : sec.items } : null;
        })
        .filter(Boolean);
    } else if (catalogKey === 'carpenter') {
      result = result
        .map(sec => {
          const secTitle = (sec.title || '').toLowerCase();
          const filteredItems = (sec.items || []).filter(item => {
            const it = (item.title || '').toLowerCase();
            return it.includes('door') || it.includes('lock') || it.includes('carpent') || it.includes('handle') || it.includes('furniture') || it.includes('table') || it.includes('bed');
          });
          return (secTitle.includes('carpent') || secTitle.includes('door') || filteredItems.length > 0) ? { ...sec, items: filteredItems.length > 0 ? filteredItems : sec.items } : null;
        })
        .filter(Boolean);
    }

    return result;
  }, [backendServices, catalogKey]);

  const defaultCategoryIcon = useMemo(() => {
    if (category?.icon) return category.icon;
    if (category?.iconUrl) return category.iconUrl;
    if (catalogKey === 'fan-repair') return '/services/fan-repair.jpg';
    if (catalogKey === 'home-wiring') return '/services/electrical/home-wiring.jpg';
    if (catalogKey === 'inverter') return '/services/electrical/inverter.jpg';
    if (catalogKey === 'mcb') return '/services/electrical/mcb.jpg';
    if (catalogKey === 'switches-sockets') return '/services/switch-socket.jpg';
    if (catalogKey === 'tap-repair') return '/services/tap-repair.jpg';
    if (catalogKey === 'geyser') return '/ServiceIcon/water-heater.svg';
    if (catalogKey === 'room-heater') return '/services/winter/room-heater.svg';
    if (catalogKey === 'bathroom-cleaning') return '/categories/bathroom-sink.svg';
    if (catalogKey === 'sofa-cleaning') return '/categories/sofa-cleaning.svg';
    if (catalogKey === 'kitchen-cleaning') return '/cleaning-essentials/kitchen-cleaning.svg';
    if (catalogKey === 'threading') return '/services/threading.jpg';
    if (catalogKey === 'waxing') return '/services/spatula-waxing.jpg';
    if (catalogKey === 'microwave') return '/ServiceIcon/microwave.svg';
    if (catalogKey === 'refrigerator') return '/ServiceIcon/refrigerator.svg';
    if (catalogKey === 'washing-machine') return '/ServiceIcon/washing-machine.svg';
    if (catalogKey === 'water-purifier') return '/ServiceIcon/ro-purifier.svg';
    if (catalogKey === 'electrician-services') return '/categories/electrician-switch.svg';
    if (catalogKey === 'plumber') return '/categories/plumber-toilet.svg';
    if (catalogKey === 'carpenter') return '/categories/carpenter-door.svg';
    if (catalogKey === 'furniture-assembly') return '/categories/furniture-assembly.svg';
    if (catalogKey === 'ac-repair') return '/categories/ac-appliance.svg';
    if (catalogKey === 'cleaning') return '/categories/cleaning.svg';
    if (catalogKey === 'mens-salon') return '/services/mens-salon/haircut.jpg';
    if (catalogKey === 'womens-salon') return '/noteworthy/salon-luxe.jpg';
    if (catalogKey === 'painting') return '/categories/painting.png';
    if (catalogKey === 'car-wash-at-home' || catalogKey === 'vehicle-washing') return '/categories/vehicle-washing.png';
    if (catalogKey === 'nail-art-extensions') return '/categories/nail-art.png';
    if (catalogKey === 'cctv-services') return '/categories/cctv.png';
    if (catalogKey === 'water-tank-cleaning') return '/categories/water-tank.png';
    return '/categories/all-services.svg';
  }, [category, catalogKey]);

  // Combined SubCategories (pills at top)
  const combinedSubCategories = useMemo(() => {
    const isMenCat = (categoryTitle || '').toLowerCase().includes('men') || (category?.slug || '').includes('men') || catalogKey === 'mens-salon';
    const isWomenCat = (categoryTitle || '').toLowerCase().includes('women') || (category?.slug || '').includes('women') || catalogKey === 'womens-salon';

    // A single brand is no choice: its services are listed directly, without a brand pill
    const livePills = (liveSections.length > 1 ? liveSections : []).map((sec) => {
      let icon = sec.icon;
      // If icon is cross-contaminated or generic, resolve cleanly
      const isCrossContaminated = !icon || 
        icon.includes('electrician.svg') ||
        (isMenCat && (icon.includes('switch-socket') || icon.includes('womens-salon') || icon.includes('electrician'))) ||
        (isWomenCat && (icon.includes('switch-socket') || icon.includes('mens-salon') || icon.includes('electrician')));

      if (isCrossContaminated) {
        icon = getCategoryIllustration(sec.title) || resolveServiceImage(sec.items?.[0] || { title: sec.title }, category, sec.title);
      }
      return {
        id: sec.id,
        title: sec.title,
        icon
      };
    });

    const isLive = liveSections.length > 0 || (catalogData?.subCategories && catalogData.subCategories.length > 0);

    if (isLive) {
      const seenTitles = new Set(livePills.map(p => (p.title || '').toLowerCase().trim()));
      const backendSubCats = (catalogData?.subCategories || [])
        .filter(sc => !seenTitles.has((sc.title || '').toLowerCase().trim()))
        .map(sc => ({
          id: sc._id || sc.slug,
          title: sc.title,
          icon: sc.icon || sc.homeIconUrl || getCategoryIllustration(sc.title) || resolveServiceImage({ title: sc.title }, category, sc.title),
          isSubCategory: true,
          raw: sc
        }));

      return [...livePills, ...backendSubCats];
    }

    return livePills;
  }, [liveSections, catalogConfig.subCategories, catalogData?.subCategories, category, categoryTitle, catalogKey]);

  // Set default active tab
  useEffect(() => {
    if (category?.initialBrand?.title) {
      const bSlug = `section-${String(category.initialBrand.title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      setActiveSubTab(bSlug);
      setTimeout(() => scrollToSection(bSlug), 300);
      return;
    }
    if (combinedSubCategories?.[0]) {
      setActiveSubTab(combinedSubCategories[0].id);
    }
  }, [combinedSubCategories, category?.initialBrand, scrollToSection]);

  // Fetch live backend services if category ID exists
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setIsSearchOpen(false);
      setIsMenuOpen(false);
      setSelectedItemDetails(null);
      setBackendServices([]);
      setCatalogData(null);
      return;
    }

    const fetchLiveData = async () => {
      const catId = category?.id || category?._id;
      const catSlug = category?.slug;
      if (!catId && !catSlug) return;

      try {
        const slugOrId = catSlug || catId;
        const cityId = currentCity?._id || currentCity?.id;
        const res = await publicCatalogService.getCatalog(slugOrId, cityId, zoneId);
        if (res.success) {
          setCatalogData(res);
          const allServices = (res.sections || []).flatMap(s => (s.services || []).map(svc => ({
            ...svc,
            brandName: s.title,
            brandIcon: s.iconUrl,
            categoryName: res.category?.title
          })));
          if (allServices.length > 0) {
            setBackendServices(allServices);
            return;
          }
          // A page that is only a choice of appliances has no services of its own. That is the
          // complete answer, so do not fall back to listing every service under it.
          if ((res.subCategories || []).length > 0) {
            setBackendServices([]);
            return;
          }
        }
      } catch { /* fall through to getServices */ }

      if (catId) {
        try {
          const cityId = currentCity?._id || currentCity?.id;
          const res = await publicCatalogService.getServices({ categoryId: catId, cityId, zoneId });
          if (res.success && Array.isArray(res.services)) {
            setBackendServices(res.services);
          }
        } catch { /* silent fallback */ }
      }
    };

    fetchLiveData();
  }, [isOpen, category?.id, category?._id, category?.slug, currentCity, zoneId]);

  // Combine curated sections with live backend services (LIVE EXCLUSIVE, deduplicated by section title)
  const combinedSections = useMemo(() => {
    // If live backend services are present, display ONLY live sections!
    if (liveSections.length > 0) {
      const seenSectionTitles = new Set();
      let sections = liveSections.filter(sec => {
        const key = (sec.title || '').toLowerCase().trim();
        if (seenSectionTitles.has(key)) return false;
        seenSectionTitles.add(key);
        return true;
      });

      // Filter by search query if any
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        sections = sections.map(sec => ({
          ...sec,
          items: (sec.items || []).filter(item =>
            item.title.toLowerCase().includes(q) ||
            (item.bullets || []).some(b => b.toLowerCase().includes(q))
          )
        })).filter(sec => (sec.items || []).length > 0);
      }

      return sections;
    }

    return [];
  }, [liveSections, searchQuery]);

  // A category that only leads to sub-categories (AC, Cooler...) is its banner and a set of tiles: no rating or offers
  const tilesOnly = combinedSections.length === 0 && (catalogData?.subCategories || []).length > 0;

  // Cart calculations
  const cartItemMap = useMemo(() => {
    const map = new Map();
    (cartItems || []).forEach(item => {
      const key = String(item.serviceId?._id || item.serviceId || item.title);
      map.set(key, item);
      map.set(String(item.title).toLowerCase().trim(), item);
    });
    return map;
  }, [cartItems]);

  const totalCartCount = useMemo(() => {
    return (cartItems || []).reduce((sum, item) => sum + (Number(item.serviceCount) || 1), 0);
  }, [cartItems]);

  const lastCartItemTitle = useMemo(() => {
    if (!cartItems || cartItems.length === 0) return categoryTitle;
    const last = cartItems[cartItems.length - 1];
    return last.title || last.serviceName || categoryTitle;
  }, [cartItems, categoryTitle]);

  // A sub-category (an appliance such as AC or Washing Machine) opens as its own page
  const openSubCategory = (sc) => {
    const id = sc._id || sc.id;
    // Nested under this category so the URL reads /user/category/ac/air-conditioner and survives refresh
    const parent = category?.slug || category?.id || category?._id;
    navigate(`/user/category/${encodeURIComponent(parent)}/${encodeURIComponent(sc.slug || id)}`, {
      state: { category: { id, _id: id, slug: sc.slug, title: sc.title, homeIconUrl: sc.homeIconUrl || sc.icon } }
    });
  };

  // Handle Add to Cart
  const handleAddToCart = async (item, e, answers) => {
    e?.stopPropagation?.();

    // A service with questions (brand, vehicle type...) asks them in a bottom sheet first
    if (!answers && (item.detailFields || []).length > 0) {
      setOptionsRequest({
        title: item.title,
        price: item.price,
        fields: item.detailFields,
        onConfirm: async (chosen) => {
          await handleAddToCart(item, null, chosen);
          setOptionsRequest(null);
        }
      });
      return;
    }

    setAddingId(item.id);

    try {
      const unitPrice = Number(item.price) || 499;
      const cartItemData = {
        categoryId: category?.id || category?._id || undefined,
        serviceId: item.isBackendService ? item.backendServiceId : undefined,
        title: item.title,
        serviceName: item.title,
        category: categoryTitle,
        categoryTitle: categoryTitle,
        price: unitPrice,
        unitPrice: unitPrice,
        serviceCount: 1,
        details: answers || undefined,
        rating: item.rating || '',
        reviews: item.reviews || '',
        card: {
          title: item.title,
          subtitle: item.bullets?.[0] || '',
          price: unitPrice,
          originalPrice: item.originalPrice,
          duration: item.duration || '45 mins',
          imageUrl: item.image || '',
          features: item.bullets || []
        }
      };

      await addToCart(cartItemData);
      toast.success(`${item.title} added to cart`, { id: 'cart-added', duration: 1800 });
    } catch (err) {
      toast.error('Failed to add service');
    } finally {
      setAddingId(null);
    }
  };

  // Handle Add to Cart for specific Variant
  const handleVariantAddToCart = async (parentItem, variant, e, answers) => {
    e?.stopPropagation?.();

    if (!answers && (parentItem.detailFields || []).length > 0) {
      setOptionsRequest({
        title: `${parentItem.title} - ${variant.title}`,
        price: Number(variant.price) || Number(parentItem.price),
        fields: parentItem.detailFields,
        onConfirm: async (chosen) => {
          await handleVariantAddToCart(parentItem, variant, null, chosen);
          setOptionsRequest(null);
        }
      });
      return;
    }

    const variantKey = `${parentItem.id}-${variant._id || variant.id}`;
    setAddingId(variantKey);

    try {
      const unitPrice = Number(variant.price) || Number(parentItem.price) || 499;
      const cartItemData = {
        categoryId: category?.id || category?._id || undefined,
        serviceId: parentItem.isBackendService ? parentItem.backendServiceId : (parentItem.id || undefined),
        variantId: variant._id || variant.id,
        variantSnapshot: {
          title: variant.title,
          durationMinutes: variant.durationMinutes ? Number(variant.durationMinutes) : null,
          inclusions: Array.isArray(variant.inclusions) ? variant.inclusions : []
        },
        title: `${parentItem.title} - ${variant.title}`,
        serviceName: `${parentItem.title} - ${variant.title}`,
        category: categoryTitle,
        categoryTitle: categoryTitle,
        price: unitPrice,
        unitPrice: unitPrice,
        serviceCount: 1,
        details: answers || undefined,
        rating: parentItem.rating || '',
        reviews: parentItem.reviews || '',
        card: {
          title: `${parentItem.title} - ${variant.title}`,
          subtitle: variant.inclusions?.[0] || parentItem.bullets?.[0] || '',
          price: unitPrice,
          originalPrice: variant.originalPrice || parentItem.originalPrice,
          duration: variant.durationMinutes ? `${variant.durationMinutes} mins` : parentItem.duration,
          imageUrl: variant.imageUrl || parentItem.image || '',
          features: variant.inclusions?.length > 0 ? variant.inclusions : (parentItem.bullets || [])
        }
      };

      await addToCart(cartItemData);
      toast.success(`${parentItem.title} - ${variant.title} added to cart`, { id: 'variant-cart-added', duration: 1800 });
    } catch (err) {
      toast.error('Failed to add variant to cart');
    } finally {
      setAddingId(null);
    }
  };

  // Handle Variant Quantity Stepper
  const handleVariantIncrement = async (parentItem, variant, e) => {
    e?.stopPropagation?.();
    const targetTitleDash = `${parentItem.title} - ${variant.title}`;
    const targetTitleParen = `${parentItem.title} (${variant.title})`;
    const targetVariantId = String(variant._id || variant.id);
    const existing = (cartItems || []).find(ci =>
      (ci.variantId && String(ci.variantId) === targetVariantId) ||
      (ci.title === targetTitleDash) ||
      (ci.title === targetTitleParen)
    );
    if (!existing) return;
    const currentCount = existing.serviceCount || 1;
    await updateItem(existing._id || existing.id, currentCount + 1);
  };

  const handleVariantDecrement = async (parentItem, variant, e) => {
    e?.stopPropagation?.();
    const targetTitleDash = `${parentItem.title} - ${variant.title}`;
    const targetTitleParen = `${parentItem.title} (${variant.title})`;
    const targetVariantId = String(variant._id || variant.id);
    const existing = (cartItems || []).find(ci =>
      (ci.variantId && String(ci.variantId) === targetVariantId) ||
      (ci.title === targetTitleDash) ||
      (ci.title === targetTitleParen)
    );
    if (!existing) return;
    const currentCount = existing.serviceCount || 1;
    if (currentCount <= 1) {
      await removeItem(existing._id || existing.id);
      toast.success(`${targetTitleDash} removed`);
    } else {
      await updateItem(existing._id || existing.id, currentCount - 1);
    }
  };

  // Handle Quantity Change
  const handleIncrement = async (item, e) => {
    e?.stopPropagation?.();
    const existing = cartItemMap.get(String(item.id)) || cartItemMap.get(String(item.title).toLowerCase().trim());
    if (!existing) return;
    const currentCount = existing.serviceCount || 1;
    await updateItem(existing._id || existing.id, currentCount + 1);
  };

  const handleDecrement = async (item, e) => {
    e?.stopPropagation?.();
    const existing = cartItemMap.get(String(item.id)) || cartItemMap.get(String(item.title).toLowerCase().trim());
    if (!existing) return;
    const currentCount = existing.serviceCount || 1;
    if (currentCount <= 1) {
      await removeItem(existing._id || existing.id);
      toast.success(`${item.title} removed`);
    } else {
      await updateItem(existing._id || existing.id, currentCount - 1);
    }
  };


  // Share link
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${categoryTitle} - Help-U`,
          text: `Check out ${categoryTitle} on Help-U with doorstep service!`,
          url: window.location.href
        });
      } catch {
        /* ignore */
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      } catch {
        toast('Share: ' + window.location.href);
      }
    }
  };

  if (!isOpen) return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="service-catalog-modal"
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          className="fixed inset-0 z-[10000] bg-white flex flex-col w-full max-w-lg mx-auto overflow-hidden select-none shadow-2xl"
          style={{ height: '100dvh' }}
        >
          <ModalLock />
          {/* ========================================================================= */}
          {/* 1. TOP STICKY BAR (Clean, modern, crisp) */}
          {/* ========================================================================= */}
          <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-3.5 py-2.5 flex items-center justify-between gap-2 shadow-xs">
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-gray-800 hover:bg-gray-100 active:scale-95 transition-all"
              aria-label="Back"
            >
              <FiArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>

            <div className="flex-1 min-w-0 px-1">
              <h1 className="text-[16px] sm:text-[17px] font-bold text-gray-900 truncate leading-tight">
                {categoryTitle}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <FiZap className="w-3 h-3 fill-emerald-600 stroke-none text-emerald-600" />
                  Pro arrives in {catalogConfig.etaMinutes || 55} mins
                </span>
              </div>
            </div>

            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setIsSearchOpen(prev => !prev)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 active:scale-95 transition-all"
                aria-label="Search"
              >
                <FiSearch className="w-4 h-4 stroke-[2]" />
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="w-9 h-9 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 active:scale-95 transition-all"
                aria-label="Share"
              >
                <FiShare2 className="w-4 h-4 stroke-[2]" />
              </button>
            </div>
          </div>

          {/* In-Page Search Bar */}
          {isSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2"
            >
              <FiSearch className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search in ${categoryTitle}...`}
                className="w-full bg-transparent text-[13px] text-gray-800 placeholder-gray-400 outline-none"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* SCROLLABLE CATALOG BODY */}
          {/* ========================================================================= */}
          <div
            ref={catalogScrollRef}
            className={`flex-1 overflow-y-auto overscroll-contain ${
              totalCartCount > 0 ? 'pb-32' : 'pb-[calc(5rem+var(--safe-bottom))]'
            }`}
          >
            {/* HERO PROMOTIONAL BANNER */}
            {catalogConfig.hero && (
              <div className="relative w-full aspect-[16/9] sm:aspect-[2/1] overflow-hidden bg-gray-900">
                <ImageWithFallback
                  src={catalogConfig.hero.image}
                  alt={catalogConfig.hero.title}
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

                <div className="absolute bottom-4 left-4 right-4 text-white">
                  {catalogConfig.hero.tag && (
                    <span className="inline-block bg-[#501323] text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-1.5 shadow-sm">
                      {catalogConfig.hero.tag}
                    </span>
                  )}
                  <h2 className="text-[21px] sm:text-[23px] font-extrabold leading-tight tracking-tight drop-shadow-sm">
                    {catalogConfig.hero.title}
                  </h2>
                  <p className="text-[13px] font-medium text-white/90 mt-0.5">
                    Starting ₹{catalogConfig.hero.startingPrice}
                  </p>
                </div>

                {/* Dots indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                  <span className="w-5 h-1 rounded-full bg-white" />
                  <span className="w-1.5 h-1 rounded-full bg-white/40" />
                  <span className="w-1.5 h-1 rounded-full bg-white/40" />
                </div>
              </div>
            )}

            {/* STORE TITLE, RATING & INSTANT BADGE */}
            {!tilesOnly && (
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-[22px] sm:text-[24px] font-bold text-gray-900 tracking-tight leading-tight">
                    {categoryTitle}
                  </h1>
                  {(catalogConfig.rating || catalogConfig.bookings) && (
                    <div className="flex items-center gap-1.5 mt-1 text-[13px] text-gray-600">
                      {catalogConfig.rating && (
                        <span className="flex items-center gap-1 font-semibold text-gray-900">
                          <FiStar className="w-3.5 h-3.5 fill-[#EAB308] text-[#EAB308] stroke-none" />
                          {catalogConfig.rating}
                        </span>
                      )}
                      {catalogConfig.bookings && (
                        <span className="underline decoration-dotted text-gray-500 font-normal">
                          ({catalogConfig.bookings})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Instant Arrival Card */}
                <div className="bg-[#E8F8F0] border border-[#B7EBD0] text-[#00875A] px-3 py-1.5 rounded-xl flex flex-col items-center shrink-0 shadow-xs">
                  <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider">
                    <FiZap className="w-3 h-3 fill-[#00875A] stroke-none" />
                    Instant
                  </div>
                  <div className="text-[11px] font-semibold leading-tight mt-0.5">
                    In {catalogConfig.etaMinutes || 55} mins
                  </div>
                </div>
              </div>

              {/* COUPON CARD */}
              {catalogConfig.coupon && (
                <div className="mt-3.5 p-3 rounded-2xl border border-gray-100 bg-[#F8F9FA] flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#E6F4EA] text-[#00875A] flex items-center justify-center shrink-0">
                      <FiPercent className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-gray-900 leading-tight truncate">
                        {catalogConfig.coupon.title}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                        {catalogConfig.coupon.subtitle}
                      </p>
                    </div>
                  </div>
                  <div className="text-[11px] font-semibold text-gray-400 shrink-0">
                    1/2 •
                  </div>
                </div>
              )}
            </div>
            )}

            {/* ========================================================================= */}
            {/* SUB-CATEGORY PILL SELECTOR (Screenshots 1 & 2) */}
            {/* ========================================================================= */}
            {combinedSubCategories?.length > 0 && combinedSections.length > 0 && (
              <div className="mt-2.5 border-y border-gray-100 bg-white py-3">
                <div className="flex items-start gap-3.5 overflow-x-auto px-4 scrollbar-hide overscroll-x-contain">
                  {combinedSubCategories.map((sub) => {
                    const isActive = activeSubTab === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => (sub.isSubCategory ? openSubCategory(sub.raw) : scrollToSection(sub.id))}
                        className="flex flex-col items-center text-center shrink-0 w-[68px] sm:w-[74px] group focus:outline-none cursor-pointer"
                      >
                        <div
                          className={`relative w-14 h-14 sm:w-15 sm:h-15 rounded-2xl p-0.5 flex items-center justify-center transition-all ${
                            isActive
                              ? 'border-2 border-[#6B38FB] bg-purple-50/50 shadow-sm'
                              : 'border border-gray-200/80 bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          {sub.badge && !sub.icon ? (
                            <div className="w-full h-full rounded-xl bg-[#EBFBF2] flex flex-col items-center justify-center text-center p-1">
                              <span className="text-[9px] font-bold text-[#00875A] leading-tight">
                                Upto
                              </span>
                              <span className="text-[13px] font-black text-[#00875A] leading-none">
                                20%
                              </span>
                              <span className="text-[9px] font-extrabold text-[#00875A] leading-tight">
                                OFF
                              </span>
                            </div>
                          ) : (
                            <ImageWithFallback
                              src={sub.icon}
                              alt={sub.title}
                              fallback={getCategoryIllustration(sub.title) || defaultCategoryIcon}
                              className="w-full h-full object-contain p-1 rounded-xl"
                            />
                          )}

                          {sub.isNew && (
                            <span className="absolute -top-1.5 -right-1 bg-[#501323] text-white text-[8px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider shadow-xs">
                              New
                            </span>
                          )}
                        </div>
                        <span
                          className={`mt-1.5 text-[11px] leading-tight line-clamp-2 text-center transition-colors ${
                            isActive ? 'font-bold text-[#6B38FB]' : 'font-medium text-gray-700'
                          }`}
                        >
                          {sub.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SECTIONS & DETAILED SERVICE CARDS */}
            {/* ========================================================================= */}
            <div className="px-4 py-4 space-y-6">
              {combinedSections.length === 0 && (catalogData?.subCategories || []).length > 0 ? (
                <div>
                  <div className="grid grid-cols-3 gap-3.5">
                    {catalogData.subCategories.map((sc) => (
                      <CategoryTile
                        key={sc._id || sc.slug}
                        title={sc.title}
                        icon={sc.icon || sc.homeIconUrl}
                        fallbackIcon={getCategoryIllustration(sc.title) || defaultCategoryIcon}
                        onClick={() => openSubCategory(sc)}
                      />
                    ))}
                  </div>
                </div>
              ) : combinedSections.length === 0 ? (
                <div className="py-16 px-4 text-center">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
                    <FiInfo className="w-8 h-8" />
                  </div>
                  <p className="text-base font-bold text-gray-700">No services available</p>
                  <p className="text-xs text-gray-400 mt-1">Services for this category will appear here soon.</p>
                </div>
              ) : (
                combinedSections.map((section) => (
                <div
                  key={section.id}
                  ref={(el) => (sectionRefs.current[section.id] = el)}
                  className="space-y-3.5 pt-1"
                >
                  {/* Section Title (only when there is more than one brand to tell apart) */}
                  {combinedSections.length > 1 && (
                    <h3 className="text-[19px] sm:text-[20px] font-bold text-gray-900 tracking-tight">
                      {section.title}
                    </h3>
                  )}

                  {/* Optional Large Promo Banner Card */}
                  {section.bannerPromo && (
                    <div className="relative rounded-2xl overflow-hidden aspect-[16/9] sm:aspect-[2/1] shadow-xs border border-gray-100 bg-gray-50">
                      <ImageWithFallback
                        src={section.bannerPromo.image}
                        alt={section.bannerPromo.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-4 text-white">
                        <h4 className="text-[18px] sm:text-[19px] font-bold leading-tight">
                          {section.bannerPromo.title}
                        </h4>
                        {section.bannerPromo.originalPrice && (
                          <span className="text-[12px] line-through text-white/70">
                            ₹{section.bannerPromo.originalPrice}
                          </span>
                        )}
                        <p className="text-[12px] text-white/90 mt-0.5">
                          {section.bannerPromo.subtitle}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* List of items */}
                  <div className="space-y-3.5">
                    {section.items?.map((item) => {
                      const itemInCart = cartItemMap.get(String(item.id)) ||
                                         cartItemMap.get(String(item.title).toLowerCase().trim());
                      const quantity = itemInCart?.serviceCount || 0;
                      const isAdding = addingId === item.id;

                      const activeVariants = Array.isArray(item.variants)
                        ? item.variants.filter(v => v.isActive !== false && Number(v.price) >= 0)
                        : [];
                      const hasVariants = activeVariants.length > 0;
                      const lowestVariantPrice = hasVariants
                        ? Math.min(...activeVariants.map(v => Number(v.price)))
                        : null;

                      // Check if any variant of this item is in the cart
                      const variantsInCartCount = hasVariants
                        ? (cartItems || []).reduce((acc, cItem) => {
                            const match = cItem.serviceId === (item.backendServiceId || item.id) ||
                                          (cItem.title && String(cItem.title).startsWith(item.title));
                            return match ? acc + (Number(cItem.serviceCount) || 1) : acc;
                          }, 0)
                        : 0;

                      return (
                        <div
                          key={item.id}
                          className={`rounded-2xl border transition-all relative overflow-hidden ${
                            item.isPackage
                              ? 'border-emerald-200/90 bg-gradient-to-b from-emerald-50/25 via-white to-white shadow-xs hover:shadow-md'
                              : 'bg-white border-gray-200/80 shadow-xs hover:shadow-sm'
                          }`}
                        >
                          {/* Distinguished Combo / Package Top Banner */}
                          {item.isPackage && (
                            <div className="bg-gradient-to-r from-[#00875A] via-teal-700 to-emerald-800 text-white px-3.5 py-1.5 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                                  <FiBookmark className="w-2.5 h-2.5 fill-white stroke-none text-white" />
                                </span>
                                <span className="text-[11px] font-black uppercase tracking-wider">
                                  SUPER SAVER PACKAGE
                                </span>
                              </div>
                              {item.discount ? (
                                <span className="text-[10px] font-black bg-white text-[#00875A] px-2 py-0.5 rounded-full shadow-2xs uppercase tracking-tight">
                                  {item.discount}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">
                                  Combo Pack
                                </span>
                              )}
                            </div>
                          )}

                          <div className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              {/* Left Info Column */}
                              <div className="flex-1 min-w-0 pr-1">
                                <h4 className="text-[15px] sm:text-[16px] font-bold text-gray-900 leading-snug">
                                  {item.title}
                                </h4>

                                {/* Rating & Reviews */}
                                {(item.rating || item.reviews) && (
                                  <div className="flex items-center gap-1.5 mt-1 text-[12px] text-gray-500">
                                    {item.rating && (
                                      <span className="flex items-center gap-0.5 font-semibold text-gray-900">
                                        <FiStar className="w-3 h-3 fill-[#EAB308] text-[#EAB308] stroke-none" />
                                        {item.rating}
                                      </span>
                                    )}
                                    {item.reviews && (
                                      <span className="underline decoration-dotted text-gray-500 font-normal">
                                        ({item.reviews})
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Price & Duration */}
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  {hasVariants && lowestVariantPrice !== null ? (
                                    <span className="text-[15px] sm:text-[16px] font-bold text-gray-900">
                                      Starts at ₹{lowestVariantPrice.toLocaleString?.() || lowestVariantPrice}
                                    </span>
                                  ) : (
                                    <span className="text-[15px] sm:text-[16px] font-bold text-gray-900">
                                      ₹{item.price?.toLocaleString?.() || item.price}
                                    </span>
                                  )}
                                  {item.originalPrice && (
                                    <span className="text-[13px] text-gray-400 line-through font-normal">
                                      ₹{item.originalPrice?.toLocaleString?.() || item.originalPrice}
                                    </span>
                                  )}
                                  {item.duration && (
                                    <span className="text-[12px] text-gray-500 font-normal">
                                      • {item.duration}
                                    </span>
                                  )}
                                </div>

                                {/* Inclusions Breakdown: Numbered bundle breakdown for packages, bullets for single services */}
                                {item.isPackage ? (
                                  item.bullets && item.bullets.length > 0 && (
                                    <div className="mt-3 pt-2.5 border-t border-emerald-100">
                                      <div className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                        <FiCheck className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                                        <span>Includes {item.bullets.length} Services:</span>
                                      </div>
                                      <div className="space-y-1.5">
                                        {item.bullets.map((bullet, idx) => (
                                          <div
                                            key={idx}
                                            className="flex items-start gap-2 p-2 rounded-xl bg-emerald-50/60 border border-emerald-100/70 text-[12px] text-gray-700 leading-snug"
                                          >
                                            <span className="w-4 h-4 rounded-full bg-emerald-200 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                              {idx + 1}
                                            </span>
                                            <span className="flex-1 font-medium">{bullet}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )
                                ) : (
                                  item.bullets && item.bullets.length > 0 && (
                                    <ul className="mt-2.5 space-y-1.5 text-[12px] text-gray-600 border-t border-gray-100 pt-2.5 leading-relaxed">
                                      {item.bullets.map((bullet, idx) => (
                                        <li key={idx} className="flex items-start gap-1.5 leading-snug">
                                          <span className="text-gray-400 shrink-0">•</span>
                                          <span>{bullet}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )
                                )}

                                {/* Action link: Edit package / View details */}
                                <div className="mt-3">
                                  {item.isPackage ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveGalleryIndex(0);
                                        setSelectedItemDetails(item);
                                      }}
                                      className="px-3.5 py-1.5 rounded-xl border border-emerald-600/30 bg-emerald-50 text-[12px] font-bold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                    >
                                      <span>View Package Breakdown</span>
                                      <span className="text-[10px]">→</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveGalleryIndex(0);
                                        setSelectedItemDetails(item);
                                      }}
                                      className="text-[12px] font-bold text-[#6B38FB] hover:underline cursor-pointer"
                                    >
                                      View details
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Right Action Box (Always Show Image Thumbnail + Floating Discount Badge + Add / Options Button) */}
                              <div className="flex flex-col items-center justify-between shrink-0 w-20 sm:w-24">
                                <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden mb-2 bg-gray-50 border border-gray-100 shadow-2xs shrink-0 group">
                                  {(() => {
                                    const resolvedImg = resolveServiceImage(item, category, categoryTitle);
                                    return (
                                      <ImageWithFallback
                                        src={resolvedImg}
                                        alt={item.title}
                                        fallback={resolvedImg}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                    );
                                  })()}
                                  {item.discount && (
                                    <div className="absolute top-1 left-1 bg-[#00875A] text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs uppercase tracking-tight z-10">
                                      {item.discount}
                                    </div>
                                  )}
                                </div>

                                {/* ADD / VARIANT / QUANTITY STEPPER BUTTON */}
                                {hasVariants ? (
                                  variantsInCartCount > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedItemForVariants(item)}
                                      className="w-full h-8 px-2 rounded-xl bg-[#6B38FB] text-white font-bold text-[12px] shadow-xs flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                                    >
                                      <span>{variantsInCartCount} Added</span>
                                      <span className="text-[9px]">▼</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedItemForVariants(item)}
                                      className="w-full h-8 px-2 rounded-xl border border-[#6B38FB] bg-purple-50 text-[#6B38FB] font-bold text-[12px] hover:bg-purple-100 shadow-xs flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all"
                                    >
                                      <span>Options</span>
                                      <span className="text-[9px]">▼</span>
                                    </button>
                                  )
                                ) : quantity > 0 ? (
                                  <div className="flex items-center justify-between w-full h-8 px-2 rounded-xl bg-[#6B38FB] text-white shadow-xs">
                                    <button
                                      type="button"
                                      onClick={(e) => handleDecrement(item, e)}
                                      className="p-1 hover:bg-white/20 rounded active:scale-95 cursor-pointer"
                                    >
                                      <FiMinus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-[13px] font-bold">
                                      {quantity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => handleIncrement(item, e)}
                                      className="p-1 hover:bg-white/20 rounded active:scale-95 cursor-pointer"
                                    >
                                      <FiPlus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={isAdding}
                                    onClick={(e) => handleAddToCart(item, e)}
                                    className="w-full h-8 rounded-xl border border-[#6B38FB] bg-white text-[#6B38FB] font-bold text-[13px] hover:bg-purple-50 active:scale-95 shadow-xs transition-all flex items-center justify-center cursor-pointer"
                                  >
                                    {isAdding ? (
                                      <div className="w-3.5 h-3.5 border-2 border-[#6B38FB] border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      'Add'
                                    )}
                                  </button>
                                )}

                                {item.optionsCount && !hasVariants && (
                                  <span className="text-[10px] text-gray-400 mt-1">
                                    {item.optionsCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )))}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* FLOATING "☰ MENU" BUTTON (Positioned gracefully) */}
          {/* ========================================================================= */}
          {combinedSections.length > 0 && (
            <div className="relative h-0 z-40 shrink-0">
              {/* With the cart bar showing, the bar already clears the phone's bottom buttons. Without it, lift the
                  button by the phone's bottom inset so the system buttons are not drawn over it. */}
              <div
                className="absolute inset-x-0 flex justify-center pointer-events-none"
                style={{ bottom: totalCartCount > 0 ? '1rem' : 'calc(1rem + var(--safe-bottom))' }}
              >
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className="pointer-events-auto bg-[#1A1D20] text-white px-4 py-2 rounded-full font-bold text-[13px] flex items-center gap-1.5 shadow-2xl hover:bg-black active:scale-95 transition-all cursor-pointer border border-white/20"
              >
                <FiMenu className="w-4 h-4" />
                <span>Menu</span>
              </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* BOTTOM STICKY CART BAR (ONLY VISIBLE WHEN ITEMS ARE ADDED TO CART) */}
          {/* ========================================================================= */}
          <AnimatePresence>
            {totalCartCount > 0 && (
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                className="sticky bottom-0 z-50 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
              >
                {/* Green offer banner strip */}
                <div className="bg-[#E6F4EA] px-4 py-1.5 flex items-center justify-between text-[#0D652D] text-[12px] font-semibold">
                  <div className="flex items-center gap-1.5 truncate">
                    <FiPercent className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {catalogConfig.coupon?.title || 'Get 25% off upto 200'}, for new users
                    </span>
                  </div>
                  <FiChevronDown className="w-4 h-4 shrink-0 text-[#0D652D]" />
                </div>

                {/* Cart summary and View Cart Button */}
                <div className="px-4 pt-3 pb-[max(0.75rem,var(--safe-bottom))] flex items-center justify-between gap-3 bg-white">
                  <div className="min-w-0">
                    <p className="text-[14px] font-extrabold text-gray-900 leading-tight">
                      {totalCartCount} item{totalCartCount > 1 ? 's' : ''} added
                    </p>
                    <p className="text-[12px] text-gray-500 truncate leading-tight mt-0.5">
                      {lastCartItemTitle}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!asPage) onClose();
                      navigate('/user/cart');
                    }}
                    className="px-6 py-2.5 rounded-xl font-bold text-[14px] bg-[#6B38FB] hover:bg-[#5b2ee0] text-white active:scale-95 cursor-pointer shadow-md transition-all flex items-center justify-center shrink-0"
                  >
                    View cart
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ========================================================================= */}
          {/* SECTION MENU BOTTOM DRAWER */}
          {/* ========================================================================= */}
          <AnimatePresence>
            {isMenuOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMenuOpen(false)}
                  className="fixed inset-0 z-[10010] bg-black/50 backdrop-blur-[1px]"
                />
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  className="fixed inset-x-0 bottom-0 z-[10020] bg-white rounded-t-3xl p-5 pb-[max(1.25rem,var(--safe-bottom))] max-w-lg mx-auto shadow-2xl max-h-[70vh] flex flex-col"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <h3 className="text-[18px] font-bold text-gray-900">
                      Menu
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsMenuOpen(false)}
                      className="p-1 rounded-full text-gray-500 hover:bg-gray-100"
                    >
                      <FiX className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="overflow-y-auto py-2 space-y-1">
                    {combinedSections.map((sec) => (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => scrollToSection(sec.id)}
                        className="w-full py-3 px-3 flex items-center justify-between rounded-xl hover:bg-gray-50 transition-colors text-left cursor-pointer"
                      >
                        <span className="text-[14px] font-semibold text-gray-800">
                          {sec.title}
                        </span>
                        <span className="text-[12px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          {sec.items?.length || 0}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* ========================================================================= */}
          {/* SERVICE DETAIL / PACKAGE SHEET MODAL */}
          {/* ========================================================================= */}
          <AnimatePresence>
            {Boolean(selectedItemDetails) && (() => {
              const fallbackDetailImg = resolveServiceImage(selectedItemDetails, category, categoryTitle);
              const isMenCat = (categoryTitle || '').toLowerCase().includes('men') || (category?.slug || '').includes('men');
              const rawDetailImages = (Array.isArray(selectedItemDetails.images) && selectedItemDetails.images.length > 0
                ? selectedItemDetails.images
                : (selectedItemDetails.image ? [selectedItemDetails.image] : [])).filter(img => {
                  if (!img || typeof img !== 'string') return false;
                  if (isMenCat && (img.includes('switch-socket') || img.includes('electrician') || img.includes('womens-salon'))) return false;
                  return true;
                });
              const detailImages = rawDetailImages.length > 0
                ? rawDetailImages
                : [fallbackDetailImg];
              const currentBannerImg = detailImages[activeGalleryIndex] || detailImages[0] || fallbackDetailImg;

              const detailActiveVariants = Array.isArray(selectedItemDetails.variants)
                ? selectedItemDetails.variants.filter(v => v.isActive !== false && Number(v.price) >= 0)
                : [];
              const detailHasVariants = detailActiveVariants.length > 0;
              const detailLowestPrice = detailHasVariants
                ? Math.min(...detailActiveVariants.map(v => Number(v.price)))
                : null;

              return (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => {
                      setSelectedItemDetails(null);
                      setExpandedFaqIndex(null);
                      setActiveGalleryIndex(0);
                    }}
                    className="fixed inset-0 z-[10010] bg-black/60 backdrop-blur-[2px]"
                  />
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                    className="fixed inset-x-0 bottom-0 z-[10020] bg-white rounded-t-3xl max-w-lg mx-auto shadow-2xl max-h-[85vh] flex flex-col overflow-hidden safe-area-bottom"
                  >
                    {/* Top Hero Banner Gallery (16:9 / 4:3 Aspect Ratio with Swipeable Carousel & Rounded Top) */}
                    {detailImages.length > 0 ? (
                      <div
                        className="relative w-full aspect-[16/9] sm:aspect-[4/3] max-h-72 bg-gray-900/10 overflow-hidden shrink-0 group rounded-t-3xl"
                        onTouchStart={(e) => {
                          galleryTouchStartX.current = e.touches[0].clientX;
                        }}
                        onTouchEnd={(e) => {
                          if (galleryTouchStartX.current === null) return;
                          const touchEndX = e.changedTouches[0].clientX;
                          const diff = galleryTouchStartX.current - touchEndX;
                          if (diff > 45 && detailImages.length > 1) {
                            // Swipe left -> Next image
                            setActiveGalleryIndex((prev) => (prev < detailImages.length - 1 ? prev + 1 : 0));
                          } else if (diff < -45 && detailImages.length > 1) {
                            // Swipe right -> Prev image
                            setActiveGalleryIndex((prev) => (prev > 0 ? prev - 1 : detailImages.length - 1));
                          }
                          galleryTouchStartX.current = null;
                        }}
                      >
                        <ImageWithFallback
                          src={currentBannerImg}
                          alt={selectedItemDetails.title}
                          fallback={fallbackDetailImg}
                          className="w-full h-full object-cover transition-all duration-300 select-none"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/35 pointer-events-none" />

                        {/* Floating Badges */}
                        <div className="absolute top-3.5 left-3.5 flex flex-col gap-1.5 z-10 pointer-events-none">
                          {selectedItemDetails.isPackage && (
                            <span className="bg-[#00875A] text-white text-[10px] font-black px-2.5 py-1 rounded-md shadow-md uppercase tracking-wider flex items-center gap-1">
                              <FiBookmark className="w-3 h-3 fill-white stroke-none" />
                              PACKAGE
                            </span>
                          )}
                          {selectedItemDetails.discount && (
                            <span className="bg-white/95 text-[#00875A] border border-[#00875A]/20 text-[10px] font-extrabold px-2 py-0.5 rounded shadow-sm">
                              {selectedItemDetails.discount}
                            </span>
                          )}
                        </div>

                        {/* Close button */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItemDetails(null);
                            setExpandedFaqIndex(null);
                            setActiveGalleryIndex(0);
                          }}
                          className="absolute top-3.5 right-3.5 z-10 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-md hover:bg-black/70 cursor-pointer shadow-md transition-all active:scale-95"
                        >
                          <FiX className="w-5 h-5" />
                        </button>

                        {/* Multi-image carousel navigation */}
                        {detailImages.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveGalleryIndex((prev) => (prev > 0 ? prev - 1 : detailImages.length - 1));
                              }}
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 text-white flex items-center justify-center backdrop-blur-md hover:bg-black/70 cursor-pointer shadow-md transition-all active:scale-95 text-lg font-bold z-10"
                              aria-label="Previous image"
                            >
                              ‹
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveGalleryIndex((prev) => (prev < detailImages.length - 1 ? prev + 1 : 0));
                              }}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 text-white flex items-center justify-center backdrop-blur-md hover:bg-black/70 cursor-pointer shadow-md transition-all active:scale-95 text-lg font-bold z-10"
                              aria-label="Next image"
                            >
                              ›
                            </button>

                            {/* Indicator dots & counter */}
                            <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-2 z-10 pointer-events-none">
                              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/55 backdrop-blur-sm pointer-events-auto shadow-sm">
                                {detailImages.map((_, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setActiveGalleryIndex(idx)}
                                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                                      activeGalleryIndex === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                                    }`}
                                    aria-label={`Go to slide ${idx + 1}`}
                                  />
                                ))}
                                <span className="text-[10px] font-bold text-white/95 ml-1">
                                  {activeGalleryIndex + 1}/{detailImages.length}
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="text-[17px] font-bold text-gray-900 truncate">
                          {selectedItemDetails.title}
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItemDetails(null);
                            setExpandedFaqIndex(null);
                            setActiveGalleryIndex(0);
                          }}
                          className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 cursor-pointer"
                        >
                          <FiX className="w-5 h-5" />
                        </button>
                      </div>
                    )}

                    <div className="p-5 overflow-y-auto space-y-4 text-gray-700 text-[13px] leading-relaxed">
                      {detailImages.length > 0 && (
                        <div>
                          <h3 className="text-[18px] sm:text-[19px] font-bold text-gray-900 leading-snug">
                            {selectedItemDetails.title}
                          </h3>
                          {(selectedItemDetails.rating || selectedItemDetails.reviews) && (
                            <div className="flex items-center gap-1.5 mt-1 text-[12px] text-gray-500">
                              {selectedItemDetails.rating && (
                                <span className="flex items-center gap-0.5 font-semibold text-gray-900">
                                  <FiStar className="w-3.5 h-3.5 fill-[#EAB308] text-[#EAB308] stroke-none" />
                                  {selectedItemDetails.rating}
                                </span>
                              )}
                              {selectedItemDetails.reviews && (
                                <span className="underline decoration-dotted text-gray-500 font-normal">
                                  ({selectedItemDetails.reviews})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Pricing block */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {detailHasVariants && detailLowestPrice !== null ? (
                          <span className="text-[20px] font-bold text-gray-900">
                            Starts at ₹{detailLowestPrice.toLocaleString?.() || detailLowestPrice}
                          </span>
                        ) : (
                          <span className="text-[20px] font-bold text-gray-900">
                            ₹{selectedItemDetails.price?.toLocaleString?.() || selectedItemDetails.price}
                          </span>
                        )}
                        {selectedItemDetails.originalPrice && (
                          <span className="text-[14px] line-through text-gray-400">
                            ₹{selectedItemDetails.originalPrice?.toLocaleString?.() || selectedItemDetails.originalPrice}
                          </span>
                        )}
                        {selectedItemDetails.discount && (
                          <span className="text-[11px] font-extrabold text-[#00875A] bg-[#EBFBF2] px-2 py-0.5 rounded-md border border-[#C6F0D6]">
                            {selectedItemDetails.discount}
                          </span>
                        )}
                        {selectedItemDetails.duration && (
                          <span className="text-[12px] text-gray-500 font-normal">
                            • {selectedItemDetails.duration}
                          </span>
                        )}
                      </div>

                      {/* Service Description */}
                      {selectedItemDetails.description && (
                        <p className="text-[13px] text-gray-600 leading-relaxed border-b border-gray-100 pb-3">
                          {selectedItemDetails.description}
                        </p>
                      )}

                      {/* What's Included / Package Breakdown */}
                      {((selectedItemDetails.inclusions && selectedItemDetails.inclusions.length > 0) || (selectedItemDetails.bullets && selectedItemDetails.bullets.length > 0)) && (
                        <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-100/80">
                          <h4 className="font-bold text-gray-900 text-[14px] mb-2.5 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[11px] font-bold">
                              ✓
                            </span>
                            {selectedItemDetails.isPackage
                              ? `Package Inclusions Breakdown (${(selectedItemDetails.inclusions?.length || selectedItemDetails.bullets?.length)} Services):`
                              : "What's Included:"}
                          </h4>
                          <ul className="space-y-2">
                            {(selectedItemDetails.inclusions?.length > 0 ? selectedItemDetails.inclusions : selectedItemDetails.bullets).map((b, i) => (
                              <li key={i} className="flex items-start gap-2.5 text-[13px] text-gray-700 leading-snug">
                                {selectedItemDetails.isPackage ? (
                                  <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                                    {i + 1}
                                  </span>
                                ) : (
                                  <FiCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                )}
                                <span className={selectedItemDetails.isPackage ? "font-medium text-gray-800" : ""}>{b}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* What's Excluded */}
                      {selectedItemDetails.exclusions && selectedItemDetails.exclusions.length > 0 && (
                        <div className="bg-rose-50/60 rounded-2xl p-4 border border-rose-100/80">
                          <h4 className="font-bold text-gray-900 text-[14px] mb-2.5 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-[11px] font-bold">
                              ✕
                            </span>
                            What's Excluded:
                          </h4>
                          <ul className="space-y-2">
                            {selectedItemDetails.exclusions.map((ex, i) => (
                              <li key={i} className="flex items-start gap-2.5 text-[13px] text-gray-700 leading-snug">
                                <FiAlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                <span>{ex}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Warranty & Help-U Promise */}
                      <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 text-purple-950">
                        <div className="flex items-center gap-2 font-bold text-[13px] text-purple-900 mb-1">
                          <FiShield className="w-4 h-4 text-purple-600 shrink-0" />
                          Warranty & Help-U Promise
                        </div>
                        <p className="text-[12px] text-purple-900/90 leading-relaxed">
                          {selectedItemDetails.warranty || "100% verified expert professional, single-use sealed kits, and 30-day post-service guarantee."}
                        </p>
                      </div>

                      {/* Cancellation Policy: always the platform policy, so it matches what is charged */}
                      <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100 text-amber-950">
                        <div className="flex items-center gap-2 font-bold text-[12px] text-amber-900 mb-0.5">
                          <FiClock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          Cancellation Policy
                        </div>
                        <p className="text-[12px] text-amber-900/90 leading-relaxed">
                          {policySummaryLine(bookingConfig)}
                        </p>
                      </div>

                      {/* FAQs Accordion */}
                      {selectedItemDetails.faqs && selectedItemDetails.faqs.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <h4 className="font-bold text-gray-900 text-[14px] flex items-center gap-2">
                            <FiHelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
                            Frequently Asked Questions
                          </h4>
                          <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200/80 bg-white overflow-hidden shadow-2xs">
                            {selectedItemDetails.faqs.map((faq, idx) => {
                              const isOpen = expandedFaqIndex === idx;
                              return (
                                <div key={idx} className="transition-colors">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedFaqIndex(isOpen ? null : idx)}
                                    className="w-full py-3 px-3.5 flex items-center justify-between text-left gap-2 hover:bg-gray-50 transition-colors cursor-pointer"
                                  >
                                    <span className="text-[13px] font-semibold text-gray-800 leading-snug">
                                      {faq.question}
                                    </span>
                                    <FiChevronDown
                                      className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`}
                                    />
                                  </button>
                                  {isOpen && (
                                    <div className="px-3.5 pb-3 pt-0 text-[12px] text-gray-600 leading-relaxed bg-gray-50/50">
                                      {faq.answer}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Bottom Add to Cart or Select Options Button */}
                      <div className="pt-2 sticky bottom-0 bg-white pb-1">
                        {detailHasVariants ? (
                          <button
                            type="button"
                            onClick={() => {
                              const itemToSelect = selectedItemDetails;
                              setSelectedItemDetails(null);
                              setExpandedFaqIndex(null);
                              setActiveGalleryIndex(0);
                              setSelectedItemForVariants(itemToSelect);
                            }}
                            className="w-full py-3.5 rounded-xl bg-[#6B38FB] text-white font-bold text-[15px] shadow-lg hover:bg-[#5b2ee0] transition-colors cursor-pointer flex items-center justify-center gap-2"
                          >
                            <span>Select Options</span>
                            {detailLowestPrice !== null && (
                              <>
                                <span>•</span>
                                <span>Starts at ₹{detailLowestPrice.toLocaleString?.() || detailLowestPrice}</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              handleAddToCart(selectedItemDetails, e);
                              setSelectedItemDetails(null);
                              setExpandedFaqIndex(null);
                              setActiveGalleryIndex(0);
                            }}
                            className={`w-full py-3.5 rounded-xl text-white font-bold text-[15px] shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                              selectedItemDetails.isPackage
                                ? 'bg-gradient-to-r from-[#00875A] to-emerald-700 hover:from-emerald-700 hover:to-emerald-800'
                                : 'bg-[#6B38FB] hover:bg-[#5b2ee0]'
                            }`}
                          >
                            {selectedItemDetails.isPackage ? (
                              <span>Book Super Saver Package • ₹{selectedItemDetails.price?.toLocaleString?.() || selectedItemDetails.price}</span>
                            ) : (
                              <span>Add to cart • ₹{selectedItemDetails.price?.toLocaleString?.() || selectedItemDetails.price}</span>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </>
              );
            })()}
          </AnimatePresence>

          {/* ========================================================================= */}
          {/* VARIANT SELECTION SHEET MODAL */}
          {/* ========================================================================= */}
          <AnimatePresence>
            {Boolean(selectedItemForVariants) && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedItemForVariants(null)}
                  className="fixed inset-0 z-[10010] bg-black/60 backdrop-blur-[2px]"
                />
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  className="fixed inset-x-0 bottom-0 z-[10020] bg-white rounded-t-3xl max-w-lg mx-auto shadow-2xl max-h-[85vh] flex flex-col overflow-hidden safe-area-bottom"
                >
                  {/* Header */}
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#6B38FB] bg-purple-50 px-2 py-0.5 rounded-md">
                        Select Option
                      </span>
                      <h3 className="text-[17px] font-bold text-gray-900 mt-1 leading-snug">
                        {selectedItemForVariants.title}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedItemForVariants(null)}
                      className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 cursor-pointer"
                    >
                      <FiX className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Variant List */}
                  <div className="p-4 overflow-y-auto space-y-3.5 divide-y divide-gray-100">
                    {(selectedItemForVariants.variants || [])
                      .filter(v => v.isActive !== false)
                      .map((variant, vIdx) => {
                        const targetTitleDash = `${selectedItemForVariants.title} - ${variant.title}`;
                        const targetTitleParen = `${selectedItemForVariants.title} (${variant.title})`;
                        const targetVariantId = String(variant._id || variant.id);
                        const variantInCart = (cartItems || []).find(ci =>
                          (ci.variantId && String(ci.variantId) === targetVariantId) ||
                          (ci.title === targetTitleDash) ||
                          (ci.title === targetTitleParen)
                        );
                        const variantQty = variantInCart?.serviceCount || 0;
                        const isAddingVariant = addingId === `${selectedItemForVariants.id}-${variant._id || variant.id}`;

                        const varPrice = Number(variant.price) || 0;
                        const varOrigPrice = variant.originalPrice ? Number(variant.originalPrice) : null;
                        const varDiscount = varOrigPrice && varOrigPrice > varPrice
                          ? `${Math.round(((varOrigPrice - varPrice) / varOrigPrice) * 100)}% OFF`
                          : null;

                        return (
                          <div key={variant._id || variant.id || vIdx} className="pt-3.5 first:pt-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-[15px] font-bold text-gray-900 leading-snug">
                                  {variant.title}
                                </h4>

                                {/* Price & Duration */}
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-[16px] font-extrabold text-gray-900">
                                    ₹{varPrice.toLocaleString?.() || varPrice}
                                  </span>
                                  {varOrigPrice && (
                                    <span className="text-[13px] text-gray-400 line-through">
                                      ₹{varOrigPrice.toLocaleString?.() || varOrigPrice}
                                    </span>
                                  )}
                                  {varDiscount && (
                                    <span className="text-[10px] font-extrabold text-[#00875A] bg-[#EBFBF2] px-1.5 py-0.5 rounded border border-[#C6F0D6]">
                                      {varDiscount}
                                    </span>
                                  )}
                                  {variant.durationMinutes && (
                                    <span className="text-[12px] text-gray-500 flex items-center gap-1">
                                      <FiClock className="w-3 h-3 text-gray-400" />
                                      {variant.durationMinutes} mins
                                    </span>
                                  )}
                                </div>

                                {/* Inclusions */}
                                {Array.isArray(variant.inclusions) && variant.inclusions.length > 0 && (
                                  <ul className="mt-2 space-y-1 text-[12px] text-gray-600">
                                    {variant.inclusions.map((inc, iIdx) => (
                                      <li key={iIdx} className="flex items-start gap-1.5 leading-snug">
                                        <FiCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                        <span>{inc}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>

                              {/* Stepper or Add Button */}
                              <div className="shrink-0 w-24 flex flex-col items-end justify-center pt-0.5">
                                {variantQty > 0 ? (
                                  <div className="flex items-center justify-between w-full h-8 px-2 rounded-xl bg-[#6B38FB] text-white shadow-xs">
                                    <button
                                      type="button"
                                      onClick={(e) => handleVariantDecrement(selectedItemForVariants, variant, e)}
                                      className="p-1 hover:bg-white/20 rounded active:scale-95 cursor-pointer"
                                    >
                                      <FiMinus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-[13px] font-bold">
                                      {variantQty}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => handleVariantIncrement(selectedItemForVariants, variant, e)}
                                      className="p-1 hover:bg-white/20 rounded active:scale-95 cursor-pointer"
                                    >
                                      <FiPlus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={isAddingVariant}
                                    onClick={(e) => handleVariantAddToCart(selectedItemForVariants, variant, e)}
                                    className="w-full h-8 rounded-xl border border-[#6B38FB] bg-white text-[#6B38FB] font-bold text-[13px] hover:bg-purple-50 active:scale-95 shadow-xs transition-all flex items-center justify-center cursor-pointer"
                                  >
                                    {isAddingVariant ? (
                                      <div className="w-3.5 h-3.5 border-2 border-[#6B38FB] border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      'Add'
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Footer quick View Cart */}
                  {totalCartCount > 0 && (
                    <div className="p-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[13px] font-bold text-gray-900 leading-tight">
                          {totalCartCount} item{totalCartCount > 1 ? 's' : ''} in cart
                        </p>
                        <p className="text-[11px] text-gray-500">
                          Ready to book at your doorstep
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedItemForVariants(null);
                          if (!asPage) onClose();
                          navigate('/user/cart');
                        }}
                        className="px-5 py-2.5 rounded-xl font-bold text-[13px] bg-[#6B38FB] hover:bg-[#5b2ee0] text-white active:scale-95 cursor-pointer shadow-md transition-all shrink-0"
                      >
                        View cart
                      </button>
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? (
    <>
      {createPortal(content, document.body)}
      <ServiceOptionsSheet request={optionsRequest} onClose={() => setOptionsRequest(null)} />
    </>
  ) : content;
});

ServiceCatalogModal.displayName = 'ServiceCatalogModal';

export default ServiceCatalogModal;
