import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { themeColors } from '../../../../theme';
import Header from '../../components/layout/Header';
import SearchBar from './components/SearchBar';
import ServiceCategories from './components/ServiceCategories';
import { publicCatalogService } from '../../../../services/catalogService';
import { useCart } from '../../../../context/CartContext';
import { useCity } from '../../../../context/CityContext';
import { useZone } from '../../../../context/ZoneContext';
import { useConfig } from '../../../../context/ConfigContext';
import { toast } from 'react-hot-toast';
import { registerFCMToken } from '../../../../services/pushNotificationService';
import { motion, AnimatePresence } from 'framer-motion';
import { HiLocationMarker } from 'react-icons/hi';

// Lazy load heavy components for better initial load performance
import PromoCarousel from './components/PromoCarousel';
import SpotlightCarousel from './components/SpotlightCarousel';
// Lazy load OTHER heavy components
const NewAndNoteworthy = lazy(() => import('./components/NewAndNoteworthy'));
const MostBookedServices = lazy(() => import('./components/MostBookedServices'));
const CuratedServices = lazy(() => import('./components/CuratedServices'));
const ServiceSectionWithRating = lazy(() => import('./components/ServiceSectionWithRating'));
const ApplianceRepairSection = lazy(() => import('./components/ApplianceRepairSection'));
const Banner = lazy(() => import('./components/Banner'));
const ReferEarnSection = lazy(() => import('./components/ReferEarnSection'));
const SectionSeeAllSheet = lazy(() => import('./components/SectionSeeAllSheet'));
import SearchOverlay from './components/SearchOverlay';
import HomeSkeleton from './components/HomeSkeleton';
import AddressSelectionModal from '../Checkout/components/AddressSelectionModal';
import ScrapPromotionCard from './components/ScrapPromotionCard';
import DebugConsole from '../../components/common/DebugConsole';
import { getCategoryIllustration } from '../../utils/categoryIcons';
import { getSectionArtTheme, getSectionArtwork, getSectionArtworkFallback } from '../../utils/seasonalArtwork';



const getLocalIcon = (title) => {
  if (!title) return null;
  const t = title.toLowerCase();
  const origin = window.location.origin;
  if (t.includes('refrigerator') || t.includes('fridge')) return `${origin}/ServiceIcon/refrigerator.svg`;
  if (t.includes('water heater') || t.includes('geyser')) return `${origin}/ServiceIcon/water-heater.svg`;
  if (t.includes('microwave')) return `${origin}/ServiceIcon/microwave.jpeg`;
  if (t.includes('r.o') || t.includes('purifier') || t.includes('prufier')) return `${origin}/ServiceIcon/RpPurifier.jpeg`;
  if (t.includes('led') || t.includes('tv')) return `${origin}/ServiceIcon/LED.jpeg`;
  if (t.includes('dish washer') || t.includes('dishwasher')) return `${origin}/ServiceIcon/kitchen.jpeg`;
  if (t.includes('chimney')) return `${origin}/ServiceIcon/chiminy.jpeg`;
  if (t.includes('cooler')) return `${origin}/ServiceIcon/cooler.jpeg`;
  if (t.includes('washing machine')) return `${origin}/ServiceIcon/washing machine.jpeg`;
  if (t.includes('ac ') || t === 'ac') return `${origin}/ServiceIcon/AC.jpeg`;
  return null;
};

const mapCategories = (list) => (list || []).map(cat => {
  const dbIcon = cat.homeIconUrl || cat.icon || cat.iconUrl || cat.image || cat.imageUrl;
  return {
    id: cat.id || cat._id,
    _id: cat._id || cat.id,
    title: cat.title,
    slug: cat.slug,
    parentId: cat.parentId || null,
    homeIconUrl: cat.homeIconUrl || null,
    icon: (dbIcon ? toAssetUrl(dbIcon) : null) || getCategoryIllustration(cat.title),
    hasSaleBadge: Boolean(cat.hasSaleBadge),
    badge: cat.badge || cat.homeBadge || '',
    etaMinutes: cat.etaDefaultMinutes || cat.etaMinutes || null,
    etaDefaultMinutes: cat.etaDefaultMinutes || null,
    displayRating: cat.displayRating || '',
    bookingsLabel: cat.bookingsLabel || '',
    heroBanner: cat.heroBanner || null,
    showOnHome: cat.showOnHome !== false,
    homeOrder: cat.homeOrder || 0
  };
});

// Keyword fallback for home cards whose admin category link is missing
const CATEGORY_KEYWORDS = [
  { pattern: / (washing|washer|top load|front load) /, category: /washing/ },
  { pattern: / (geyser|water heater) /, category: /geyser|water heater/ },
  { pattern: / (fridge|fride|refrigerator) /, category: /fridge|refrigerator/ },
  { pattern: / (r\.o\.?|ro|purifier|prufier) /, category: /r\.o|purifier|prufier/ },
  { pattern: / (ac|a\.c\.?|air conditioner) /, category: /^ac$|air condition/ },
  { pattern: / cooler /, category: /cooler/ },
  { pattern: / microwave /, category: /microwave/ },
  { pattern: / chimney /, category: /chimney/ },
  { pattern: / (led|tv|television) /, category: /^led|tv/ },
  { pattern: / dish ?washer /, category: /dish ?washer/ },
];

const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = url.replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  if (clean.startsWith('/noteworthy') || clean.startsWith('/spotlight') || clean.startsWith('/categories') || clean.startsWith('/ServiceIcon') || clean.startsWith('/appliance') || clean.startsWith('/services') || clean.startsWith('/cleaning-essentials') || clean.startsWith('/cleaning')) {
    return clean;
  }
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

// All home sections are now 100% admin-managed via HomeContent.
// If admin has not configured a section it renders empty (standard CMS behavior).

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [address, setAddress] = useState(localStorage.getItem('currentAddress') || 'Select Location');
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [houseNumber, setHouseNumber] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [detectedCityName, setDetectedCityName] = useState(localStorage.getItem('currentCity') || null);


  const { cartCount, addToCart } = useCart();
  const { currentCity, cities, selectCity, loading: cityLoading } = useCity();
  const { isScrapEnabled } = useConfig();
  const { detectZone, zoneId, isOutOfZone, currentZone } = useZone();

  // Clean up legacy storage keys on mount
  useEffect(() => {
    ['userAddress', 'detectedCity', 'user_formatted_address', 'user_city'].forEach(key => localStorage.removeItem(key));
  }, []);

  // Sync detectedCityName with Address on mount/update if not already set
  useEffect(() => {
    if (address && address !== 'Select Location' && cities && cities.length > 0) {
      const foundCity = cities.find(c =>
        address.toLowerCase().includes(c.name.toLowerCase())
      );
      if (foundCity) {
        if (detectedCityName !== foundCity.name) {
          setDetectedCityName(foundCity.name);
          localStorage.setItem('currentCity', foundCity.name);
        }
      } else {
        // Address is present but doesn't contain any supported city name
        // Try to parse ANY city from the address string (e.g. "Bhopal")
        const parts = address.split(',').map(p => p.trim());
        // Usually city is 2nd or 3rd to last in Google address strings
        const cityCandidate = parts.length > 2 ? parts[parts.length - 3] : (parts.length > 1 ? parts[parts.length - 2] : parts[0]);

        if (detectedCityName !== cityCandidate) {
          setDetectedCityName(cityCandidate);
          localStorage.setItem('currentCity', cityCandidate);
        }
      }
    }
  }, [address, cities, detectedCityName]);

  // Validate city whenever detected name or cities list changes
  useEffect(() => {
    if (!detectedCityName || !cities || cities.length === 0) return;

    const matchedCity = cities.find(c =>
      c.name.toLowerCase() === detectedCityName.toLowerCase() ||
      c.name.toLowerCase().includes(detectedCityName.toLowerCase()) ||
      detectedCityName.toLowerCase().includes(c.name.toLowerCase())
    );

    if (matchedCity) {
      const matchedId = matchedCity._id || matchedCity.id;
      const currentId = currentCity?._id || currentCity?.id;

      if (!cityLoading && currentId && matchedId !== currentId) {
        selectCity(matchedCity);
        toast.success(`Location updated to ${matchedCity.name}`);
      }
    } else if (currentCity) {
      // Unlisted city: show the default home content; booking still works wherever a worker is nearby
      selectCity(null);
    }
  }, [detectedCityName, cities, currentCity, cityLoading]);


  const handleAddressSave = (savedHouseNumber, locationObj) => {
    if (locationObj) {
      const newAddress = locationObj.address;
      setAddress(newAddress);
      localStorage.setItem('currentAddress', newAddress);
      if (typeof locationObj.lat === 'number' && typeof locationObj.lng === 'number') {
        try { localStorage.setItem('userCoords', JSON.stringify({ lat: locationObj.lat, lng: locationObj.lng })); } catch { /* ignore */ }
        detectZone(locationObj.lat, locationObj.lng);
      }

      // Try to parse city from location object (Google Places)
      const components = locationObj.components || locationObj.address_components;
      let city = '';
      if (components) {
        const getComponent = (type) => components.find(c => c.types.includes(type))?.long_name || '';
        city = getComponent('locality') || getComponent('administrative_area_level_2');
      }

      // Fallback city parsing from address string if components failed
      if (!city && newAddress) {
        const parts = newAddress.split(',').map(p => p.trim());
        city = parts.length > 2 ? parts[parts.length - 3] : (parts.length > 1 ? parts[parts.length - 2] : parts[0]);
      }

      if (city) {
        setDetectedCityName(city);
        localStorage.setItem('currentCity', city);

        // Immediate update of selected city if supported
        if (cities && cities.length > 0) {
          const matchedCity = cities.find(c =>
            c.name.toLowerCase() === city.toLowerCase() ||
            c.name.toLowerCase().includes(city.toLowerCase()) ||
            city.toLowerCase().includes(c.name.toLowerCase())
          );
          if (matchedCity) {
            selectCity(matchedCity);
          } else {
            selectCity(null);
          }
        }

        toast.success(`Location set to ${city}`);
      }
    }
    setHouseNumber(savedHouseNumber);
    setIsAddressModalOpen(false);
  };

  // Auto-detect location on mount
  useEffect(() => {
    const autoDetectLocation = async () => {
      if (navigator.geolocation) {
        if (address === 'Select Location') {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              try {
                const { latitude, longitude } = position.coords;
                const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
                const response = await fetch(
                  `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
                );
                const data = await response.json();

                // Cache coordinates so category ETA badges can use them
                try { localStorage.setItem('userCoords', JSON.stringify({ lat: latitude, lng: longitude })); } catch { /* ignore */ }
                detectZone(latitude, longitude);

                if (data.status === 'OK' && data.results.length > 0) {
                  const result = data.results[0];
                  const getComponent = (type) =>
                    result.address_components.find(c => c.types.includes(type))?.long_name || '';

                  const area = getComponent('sublocality_level_1') || getComponent('neighborhood') || getComponent('locality');
                  const city = getComponent('locality') || getComponent('administrative_area_level_2');
                  const state = getComponent('administrative_area_level_1');

                  const formattedAddress = `${area}, ${city}, ${state}`;
                  setAddress(formattedAddress);
                  localStorage.setItem('currentAddress', formattedAddress);

                  if (city) {
                    setDetectedCityName(city);
                    localStorage.setItem('currentCity', city);

                    // Immediate update of selected city if supported
                    if (cities && cities.length > 0) {
                      const matchedCity = cities.find(c =>
                        c.name.toLowerCase() === city.toLowerCase() ||
                        c.name.toLowerCase().includes(city.toLowerCase()) ||
                        city.toLowerCase().includes(c.name.toLowerCase())
                      );
                      if (matchedCity) {
                        selectCity(matchedCity);
                      } else {
                        selectCity(null);
                      }
                    }
                  }
                }
              } catch (error) {
                // Silent fail
              }
            },
            (error) => {
              console.log("GPS Error:", error);
            },
            {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0
            }
          );
        }
      }
    };

    autoDetectLocation();

    // Register FCM token for user to receive push notifications
    registerFCMToken('user', true).catch(err => {/* Silent fail */ });
  }, []);

  // Revisits render instantly from the last known data; fresh data loads in the background
  const [initialSnapshot] = useState(() => publicCatalogService.peekHomeData(currentCity?._id || currentCity?.id, zoneId));
  const [categories, setCategories] = useState(() => mapCategories(initialSnapshot?.categories));
  const [homeContent, setHomeContent] = useState(() => initialSnapshot?.homeContent || null);
  const [loading, setLoading] = useState(() => !initialSnapshot);
  const hasDataRef = useRef(Boolean(initialSnapshot));

  // Handle scroll separately (only when needed)
  useEffect(() => {
    if (location.state?.scrollToTop) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.state?.scrollToTop, location.pathname]);

  // Row opened in the "See all" screen: { title, subtitle, services, variant, category }
  const [seeAllSection, setSeeAllSection] = useState(null);
  const closeSeeAll = useCallback(() => setSeeAllSection(null), []);

  // Fetch categories and home content on mount (and when city changes)
  useEffect(() => {
    const fetchData = async () => {
      // Full loader only when there is nothing to show yet
      if (!hasDataRef.current) setLoading(true);
      try {
        const cityId = currentCity?._id || currentCity?.id;
        const response = await publicCatalogService.getHomeData(cityId, zoneId);

        if (response.allCategories && response.allCategories.length > 0) {
          setCategories(mapCategories(response.allCategories));
        } else if (response.categories) {
          setCategories(mapCategories(response.categories));
        }
        if (response.homeContent) setHomeContent(response.homeContent);
        hasDataRef.current = true;
      } catch {
        // Keep showing the last known content
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentCity, zoneId]);
  const handleSearch = (query) => {
    // Navigate to search results page
  };

  const handleCategoryClick = (category) => {
    const target = category?.slug || category?.id || category?._id;
    if (!target) return;
    // history state must be structured-cloneable, so pass plain data only
    navigate(`/user/category/${encodeURIComponent(target)}`, { state: { category: JSON.parse(JSON.stringify(category)) } });
  };

  const handlePromoClick = (promo) => {
    if (promo.targetCategoryId) {
      const cat = categories.find(c => (c.id === promo.targetCategoryId || c._id === promo.targetCategoryId));
      if (cat) {
        handleCategoryClick(cat);
        return;
      }
    }
    // Slug fallback: match slug (or whole-word title match) against the live
    // categories list. Lets static/default spotlight cards resolve to a real
    // category without the admin having to pick one.
    if (promo.slug) {
      const s = promo.slug.toLowerCase();
      const cat = categories.find(c => {
        const slug = (c.slug || '').toLowerCase();
        const title = (c.title || '').toLowerCase();
        return slug === s || title.includes(s) || s.includes(slug);
      });
      if (cat) {
        handleCategoryClick(cat);
        return;
      }
    }
    if (promo.route && !promo.slug) {
      if (promo.scrollToSection) {
        navigate(promo.route, {
          state: { scrollToSection: promo.scrollToSection }
        });
      } else {
        navigate(promo.route);
      }
    }
  };

  const findCategoryById = (id) => id && categories.find(c => c.id === id || c._id === id);

  // Category a home card belongs to: its admin link first, then a whole-word match on its title
  const resolveServiceCategory = (service) => {
    if (!service) return null;
    const linked = findCategoryById(service.targetCategoryId);
    if (linked) return linked;

    // Slug fallback: lets static/default cards point at a category by its slug
    // without the admin having to pick a specific category id.
    if (service.slug) {
      const s = service.slug.toLowerCase();
      const bySlug = categories.find(c => {
        const slug = (c.slug || '').toLowerCase();
        const name = (c.title || '').toLowerCase();
        return slug === s || slug.includes(s) || s.includes(slug) || name.includes(s);
      });
      if (bySlug) return bySlug;
    }

    const title = ` ${(service.title || '').toLowerCase().replace(/[^a-z0-9.]+/g, ' ')} `;
    if (!title.trim()) return null;
    const byName = categories.find(c => {
      const name = (c.title || '').toLowerCase().trim();
      return name && title.includes(` ${name} `);
    });
    if (byName) return byName;

    const match = CATEGORY_KEYWORDS.find(({ pattern }) => pattern.test(title));
    return match ? categories.find(c => match.category.test((c.title || '').toLowerCase())) || null : null;
  };

  // Category behind a whole row: admin "see all" link, else the one category all its cards share, else a title match
  const getSectionCategory = (section) => {
    const linked = findCategoryById(section?.seeAllTargetCategoryId);
    if (linked) return linked;
    const cardCats = (section?.cards || []).map(resolveServiceCategory);
    if (cardCats.length > 0 && cardCats.every(c => c && c.id === cardCats[0].id)) return cardCats[0];
    return resolveServiceCategory({ title: section?.title });
  };

  const openSeeAll = ({ title, subtitle, services, variant, category = null }) => {
    setSeeAllSection({
      title,
      subtitle,
      services: services || [],
      variant,
      category,
      onCategoryClick: category ? () => handleCategoryClick(category) : null
    });
  };

  const handleServiceClick = (service) => {
    if (!service) return;
    const cat = resolveServiceCategory(service);
    if (cat) {
      handleCategoryClick({
        ...cat,
        title: service.title || cat.title,
        slug: service.slug || cat.slug,
        image: service.imageUrl || service.image || cat.image
      });
      return;
    }
    // Directly open ServiceCatalogModal with the clicked service
    handleCategoryClick({
      id: service.id || service._id || service.slug,
      title: service.title,
      slug: service.slug || service.title?.toLowerCase().replace(/\s+/g, '-'),
      image: service.imageUrl || service.image
    });
  };

  const handleAddClick = async (service) => {
    try {
      const linkedCat = findCategoryById(service.targetCategoryId);
      if (linkedCat) {
        handleCategoryClick({
          ...linkedCat,
          title: service.title || linkedCat.title,
          slug: service.slug || linkedCat.slug,
          image: service.imageUrl || service.image || linkedCat.image
        });
        return;
      }

      if (service.serviceId && service.categoryId) {
        const cartItemData = {
          serviceId: service.serviceId,
          categoryId: service.categoryId,
          title: service.title,
          description: service.subtitle || service.description || '',
          icon: service.image || '',
          category: service.category || 'Service',
          price: parseInt(service.price?.toString().replace(/,/g, '') || 0),
          originalPrice: service.originalPrice ? parseInt(service.originalPrice.toString().replace(/,/g, '')) : null,
          unitPrice: parseInt(service.price?.toString().replace(/,/g, '') || 0),
          serviceCount: 1,
          rating: service.rating || "",
          reviews: service.reviews || "10k+",
          vendorId: service.vendorId || null,
          sectionId: service.sectionId || null // VITAL: Added for plan benefits
        };

        const response = await addToCart(cartItemData);
        if (response.success) {
          toast.success(`${service.title} added to cart!`);
          navigate('/user/cart');
        } else {
          toast.error(response.message || 'Failed to add to cart');
        }
      } else {
        // No direct service link: open its category so the user can pick the exact service
        handleServiceClick(service);
      }
    } catch (error) {
      toast.error('Failed to add to cart. Please try again.');
    }
  };

  const handleReferClick = () => {
    navigate('/user/rewards');
  };

  const handleLocationClick = () => {
    setIsAddressModalOpen(true);
  };

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100dvh-var(--bottom-nav-height,96px)-1rem)] overflow-hidden">
        <HomeSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-canvas w-full max-w-full overflow-x-clip">
      <motion.div
        className="relative z-10 w-full max-w-full overflow-x-clip"
        initial={initialSnapshot ? false : 'hidden'}
        animate="visible"
        variants={containerVariants}
      >
        <motion.div
          variants={itemVariants}
          className="sticky top-0 z-50 bg-canvas/90 backdrop-blur-xl w-full max-w-full overflow-x-clip"
        >
          <div className="max-w-screen-xl mx-auto w-full">
            <Header
              location={address}
              onLocationClick={handleLocationClick}
              showNotifications
            />
            <div className="px-4 sm:px-5 pb-2 pt-0 max-w-2xl mx-auto w-full min-w-0 max-w-full">
              <SearchBar onInputClick={() => setIsSearchOpen(true)} />
            </div>
          </div>
        </motion.div>

        <main className="flex flex-col gap-4 sm:gap-5 max-w-screen-xl mx-auto w-full pb-6 overflow-x-clip min-w-0">
          {/* Out of Zone Notice */}
          {isOutOfZone && (
            <div className="mx-4 sm:mx-5 px-3.5 py-2.5 bg-gradient-to-r from-amber-50/95 to-orange-50/80 border border-amber-200/90 rounded-2xl flex items-center justify-between gap-3 shadow-[0_2px_8px_rgba(245,158,11,0.06)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <HiLocationMarker className="w-4.5 h-4.5 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-bold text-amber-950 leading-tight">Outside Service Area</p>
                  <p className="text-[11px] text-amber-800/90 leading-tight truncate mt-0.5">Some services may be unavailable at your current location.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(true)}
                className="px-3 py-1.5 bg-[#EA580C] hover:bg-[#C2410C] active:scale-95 text-white rounded-xl text-[11px] font-bold whitespace-nowrap transition-all shadow-xs shrink-0"
              >
                Change Location
              </button>
            </div>
          )}
            <>
              {/* Hero Section - Promo Carousel */}
              {homeContent?.isPromosVisible !== false && (homeContent?.promos || []).length > 0 && (
                <motion.section variants={itemVariants} className="relative z-0 w-full max-w-full overflow-hidden min-w-0">
                  <PromoCarousel
                    promos={(homeContent?.promos || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map(promo => ({
                      id: promo.id || promo._id,
                      title: promo.title || '',
                      subtitle: promo.subtitle || promo.description || '',
                      buttonText: promo.buttonText || 'Book now',
                      className: promo.gradientClass || 'from-[#00A6A6] to-[#008a8a]',
                      image: toAssetUrl(promo.imageUrl),
                      targetCategoryId: promo.targetCategoryId,
                      slug: promo.slug,
                      scrollToSection: promo.scrollToSection,
                      route: '/'
                    }))}
                    onPromoClick={handlePromoClick}
                  />
                </motion.section>
              )}

              {/* Categories Section */}
              {homeContent?.isCategoriesVisible !== false && (
                <motion.section variants={itemVariants} className="relative w-full max-w-full overflow-hidden min-w-0">
                  <ServiceCategories
                    categories={categories}
                    onCategoryClick={handleCategoryClick}
                    limit={homeContent?.homeCategoryLimit}
                    showAllServices={homeContent?.showAllServicesTile !== false}
                    allServicesLabel={homeContent?.allServicesLabel}
                  />
                </motion.section>
              )}

              {/* In the Spotlight Section (Urban-Company hero banners) */}
              {homeContent?.isSpotlightVisible !== false && (() => {
                const items = (homeContent?.spotlight || []).length > 0
                  ? homeContent.spotlight
                    .slice()
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map(item => ({
                      ...item,
                      imageUrl: toAssetUrl(item.imageUrl)
                    }))
                  : [];
                if (items.length === 0) return null;
                return (
                  <motion.section variants={itemVariants} className="relative w-full max-w-full overflow-hidden min-w-0">
                    <SpotlightCarousel items={items} onItemClick={handlePromoClick} />
                  </motion.section>
                );
              })()}

              {/* New & Noteworthy (right below Spotlight) */}
              {homeContent?.isNoteworthyVisible !== false && (() => {
                const adminItems = (homeContent?.noteworthy || [])
                  .filter(item => item && item.title)
                  .slice()
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map(item => ({
                    id: item.id || item._id,
                    title: item.title,
                    subtitle: item.subtitle,
                    badge: item.badge,
                    duration: item.duration,
                    image: toAssetUrl(item.imageUrl),
                    slug: item.slug,
                    targetCategoryId: item.targetCategoryId,
                    targetServiceId: item.targetServiceId
                  }));
                const items = adminItems;
                if (items.length === 0) return null;
                return (
                  <motion.div variants={itemVariants}>
                    <Suspense fallback={<div className="h-44 bg-gray-50 animate-pulse rounded-2xl mx-4" />}>
                      <NewAndNoteworthy
                        services={items}
                        onServiceClick={handleServiceClick}
                      />
                    </Suspense>
                  </motion.div>
                );
              })()}

              {/* Most Booked (right below New & Noteworthy) */}
              {homeContent?.isBookedVisible !== false && (() => {
                const adminBooked = (homeContent?.booked || [])
                  .filter(item => item && item.title)
                  .slice()
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map(item => ({
                    id: item.id || item._id,
                    title: item.title,
                    rating: item.rating,
                    reviews: item.reviews,
                    price: item.price,
                    originalPrice: item.originalPrice,
                    discount: item.discount,
                    optionsCount: item.optionsCount,
                    image: toAssetUrl(item.imageUrl),
                    targetCategoryId: item.targetCategoryId,
                    slug: item.slug
                  }));
                const items = adminBooked;
                if (items.length === 0) return null;
                return (
                  <motion.div variants={itemVariants}>
                    <Suspense fallback={<div className="h-40 bg-gray-50 animate-pulse rounded-xl mx-4" />}>
                      <MostBookedServices
                        services={items}
                        onServiceClick={handleServiceClick}
                        onAddClick={handleAddClick}
                        onSeeAllClick={(services) => openSeeAll({ title: 'Most booked services', services, variant: 'booked' })}
                      />
                    </Suspense>
                  </motion.div>
                );
              })()}

              {/* Scrap Promotion Section (right below Most Booked) */}
              {(isScrapEnabled && homeContent?.isScrapVisible !== false) && (
                <motion.section variants={itemVariants}>
                  <ScrapPromotionCard onClick={() => navigate('/user/scrap')} />
                </motion.section>
              )}

              {/* Dynamic Category Sections — all admin-managed. Visibility controlled
                  per-section via admin UI (delete or set isVisible=false). No hardcoded
                  title filters here. */}
              {homeContent?.isCategorySectionsVisible !== false && (homeContent?.categorySections || []).filter(s => (s.cards || []).length > 0 && !/winter/i.test(s.title || '')).sort((a, b) => (a.order || 0) - (b.order || 0)).map((section, sIdx) => {
                const isAppliance = (section.title || '').toLowerCase().includes('appliance');
                // Admin's first banner is injected right above the "Electric" section
                const isElectric = /electric|electrician/i.test(section.title || '');
                const electricBanner = isElectric && homeContent?.isBannersVisible !== false && homeContent?.banners?.[0]?.imageUrl ? (
                  <motion.div key={`banner-above-${section._id || sIdx}`} variants={itemVariants}>
                    <Suspense fallback={<div className="mx-4 aspect-3/1 bg-slate-100 animate-pulse rounded-[22px]" />}>
                      <Banner
                        imageUrl={toAssetUrl(homeContent.banners[0].imageUrl)}
                        onClick={() => {
                          const b = homeContent?.banners?.[0];
                          if (b?.slug) { navigate(`/user/${b.slug}`); return; }
                          if (b?.targetCategoryId) {
                            const cat = categories.find(c => c.id === b.targetCategoryId);
                            if (cat) handleCategoryClick(cat);
                          }
                        }}
                      />
                    </Suspense>
                  </motion.div>
                ) : null;

                if (isAppliance) {
                  return (
                    <React.Fragment key={section._id || sIdx}>
                      {electricBanner}
                      <motion.div variants={itemVariants}>
                        <Suspense fallback={<div className="h-40 bg-gray-50 animate-pulse rounded-xl mx-4" />}>
                          <ApplianceRepairSection
                            title="Appliance repair & service"
                            subtitle={section.subtitle}
                            services={section.cards?.map((card, cIdx) => ({
                              id: card._id || cIdx,
                              title: card.title,
                              rating: card.rating || "",
                              reviews: card.reviews || "10k+",
                              price: card.price,
                              originalPrice: card.originalPrice,
                              discount: card.discount,
                              badge: card.badge,
                              optionsCount: card.optionsCount,
                              image: toAssetUrl(card.imageUrl),
                              targetCategoryId: card.targetCategoryId,
                              slug: card.slug
                            })) || []}
                            onSeeAllClick={(services) => openSeeAll({
                              title: 'Appliance repair & service',
                              subtitle: section.subtitle,
                              services,
                              variant: 'appliance',
                              category: getSectionCategory(section)
                            })}
                            onServiceClick={(service) => handleServiceClick(service)}
                            onAddClick={handleAddClick}
                          />
                        </Suspense>
                      </motion.div>
                    </React.Fragment>
                  );
                }

                // Themed sections (winter, electrical) use a matching illustration for each service
                const artTheme = getSectionArtTheme(section.title);
                return (
                  <React.Fragment key={section._id || sIdx}>
                    {electricBanner}
                    <motion.div variants={itemVariants}>
                      <Suspense fallback={<div className="h-40 bg-gray-50 animate-pulse rounded-xl mx-4" />}>
                        <ServiceSectionWithRating
                          title={section.title}
                          subtitle={section.subtitle}
                          services={section.cards?.map((card, cIdx) => {
                            const sectionArt = artTheme ? getSectionArtwork(artTheme, card.title) : null;
                            const processedImage = sectionArt || toAssetUrl(card.imageUrl);
                            return {
                              id: card._id || cIdx,
                              title: card.title,
                              rating: card.rating || "",
                              reviews: card.reviews || "10k+",
                              price: card.price,
                              originalPrice: card.originalPrice,
                              discount: card.discount,
                              badge: card.badge,
                              optionsCount: card.optionsCount,
                              image: processedImage,
                              fallbackImage: artTheme ? getSectionArtworkFallback(artTheme) : getLocalIcon(card.title),
                              targetCategoryId: card.targetCategoryId,
                              slug: card.slug
                            };
                          }) || []}
                          onSeeAllClick={(services) => openSeeAll({
                            title: section.title,
                            subtitle: section.subtitle,
                            services,
                            category: getSectionCategory(section)
                          })}
                          onServiceClick={(service) => handleServiceClick(service)}
                          onAddClick={handleAddClick}
                        />
                      </Suspense>
                    </motion.div>
                  </React.Fragment>
                );
              })}

              {/* Cleaning Essentials is now purely admin-driven: admin creates a
                  categorySection titled "Cleaning Essentials" (or similar) and it
                  renders in the dynamic categorySections map above. No fallback. */}

              {/* Dynamic Banner 1 (banners[1]) — banners[0] is injected above Electric above */}
              {homeContent?.isBannersVisible !== false && Boolean(homeContent?.banners?.[1]?.imageUrl) && (
                <motion.div variants={itemVariants}>
                  <Suspense fallback={<div className="mx-4 aspect-3/1 bg-slate-100 animate-pulse rounded-[22px]" />}>
                    <Banner
                      imageUrl={toAssetUrl(homeContent.banners[1].imageUrl)}
                      onClick={() => {
                        const b = homeContent?.banners?.[1];
                        if (b?.slug) {
                          navigate(`/user/${b.slug}`);
                          return;
                        }
                        if (b?.targetCategoryId) {
                          const cat = categories.find(c => c.id === b.targetCategoryId);
                          if (cat) handleCategoryClick(cat);
                        }
                      }}
                    />
                  </Suspense>
                </motion.div>
              )}

              {/* Curated Services */}
              {homeContent?.isCuratedVisible !== false && (homeContent?.curated || []).filter(item => item.title && (item.gifUrl || item.imageUrl || item.youtubeUrl)).length > 0 && (
                <motion.div variants={itemVariants}>
                  <Suspense fallback={<div className="h-40 bg-gray-50 animate-pulse rounded-xl mx-4" />}>
                    <CuratedServices
                      services={(homeContent?.curated || [])
                        .filter(item => item.title && (item.gifUrl || item.imageUrl || item.youtubeUrl))
                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                        .map(item => ({
                          id: item.id || item._id,
                          title: item.title,
                          gif: toAssetUrl(item.gifUrl || item.imageUrl),
                          youtubeUrl: item.youtubeUrl || '',
                          slug: item.slug,
                          targetCategoryId: item.targetCategoryId
                        }))}
                      onServiceClick={handleServiceClick}
                    />
                  </Suspense>
                </motion.div>
              )}

              {/* Standalone Appliance Repair & Service section if not returned in dynamic categorySections */}
              {homeContent?.isCategorySectionsVisible !== false && !(homeContent?.categorySections || []).some(s => (s.title || '').toLowerCase().includes('appliance') && (s.cards || []).length > 0) && (
                <motion.div variants={itemVariants}>
                  <Suspense fallback={<div className="h-40 bg-gray-50 animate-pulse rounded-xl mx-4" />}>
                    <ApplianceRepairSection
                      onSeeAllClick={(services) => openSeeAll({ title: 'Appliance repair & service', services, variant: 'appliance' })}
                      onServiceClick={(service) => handleServiceClick(service)}
                      onAddClick={handleAddClick}
                    />
                  </Suspense>
                </motion.div>
              )}

              {/* Dynamic Banner 2 (banners[2]) */}
              {homeContent?.isBannersVisible !== false && Boolean(homeContent?.banners?.[2]?.imageUrl) && (
                <motion.div variants={itemVariants}>
                  <Suspense fallback={<div className="mx-4 aspect-3/1 bg-slate-100 animate-pulse rounded-[22px]" />}>
                    <Banner
                      imageUrl={toAssetUrl(homeContent.banners[2].imageUrl)}
                      onClick={() => {
                        const b = homeContent?.banners?.[2];
                        if (b?.targetCategoryId) {
                          const cat = categories.find(c => (c.id === b.targetCategoryId || c._id === b.targetCategoryId));
                          if (cat) handleCategoryClick(cat);
                        }
                      }}
                    />
                  </Suspense>
                </motion.div>
              )}

              {/* Refer & Earn Section */}
              <motion.div variants={itemVariants}>
                <Suspense fallback={<div className="h-32 bg-gray-50 animate-pulse rounded-xl mx-4" />}>
                  <ReferEarnSection onReferClick={handleReferClick} />
                </Suspense>
              </motion.div>
            </>
        </main>
      </motion.div>

      {/* Removed local BottomNav, rendered by routes */}

      {/* "See all" screen for a home row */}
      <AnimatePresence>
        {seeAllSection && (
          <Suspense key="see-all" fallback={null}>
            <SectionSeeAllSheet
              section={seeAllSection}
              onClose={closeSeeAll}
              onServiceClick={handleServiceClick}
              onAddClick={handleAddClick}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Search Overlay */}
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        categories={categories}
        onCategoryClick={handleCategoryClick}
      />

      {/* Address Selection Modal */}
      <AddressSelectionModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        houseNumber={houseNumber}
        onHouseNumberChange={setHouseNumber}
        onSave={handleAddressSave}
      />

      <DebugConsole />
    </div>
  );
};

export default Home;
