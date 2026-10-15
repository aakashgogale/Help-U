import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiX, FiMapPin, FiChevronDown } from 'react-icons/fi';
import { optimizeCloudinaryUrl } from '../../../../../utils/cloudinaryOptimize';
import { publicCatalogService } from '../../../../../services/catalogService';

// The exact 5 Urban Company top primary services + "All services"
const PRIMARY_SERVICES = [
  {
    id: 'womens-salon',
    sectionId: 'womens-salon-spa',
    slug: 'womens-salon',
    title: "Women's Salon & Spa",
    icon: '/categories/womens-salon.png?v=4',
    defaultEta: 55,
    matchKeywords: ['women', 'salon', 'spa', 'beauty', 'facial', 'wax']
  },
  {
    id: 'mens-salon',
    sectionId: 'mens-salon-massage',
    slug: 'mens-salon',
    title: "Men's Salon & Massage",
    icon: '/categories/mens-salon.png?v=4',
    defaultEta: null,
    matchKeywords: ['men', 'grooming', 'massage', 'barber', 'shave', 'beard']
  },
  {
    id: 'cleaning',
    sectionId: 'cleaning-section',
    slug: 'cleaning',
    title: 'Cleaning',
    icon: '/categories/cleaning.svg?v=4',
    defaultEta: 88,
    matchKeywords: ['cleaning', 'clean', 'bathroom', 'kitchen', 'sofa', 'pest']
  },
  {
    id: 'ac-appliance',
    sectionId: 'ac-appliance-repair',
    slug: 'ac',
    title: 'AC & Appliance Repair',
    icon: '/categories/ac-appliance.svg?v=4',
    defaultEta: 44,
    matchKeywords: ['ac', 'appliance', 'refriger', 'fridge', 'washing machine', 'geyser', 'tv', 'led']
  },
  {
    id: 'electrician',
    sectionId: 'electrician-plumber-carpenter',
    slug: 'electrician-services',
    title: 'Electrician, Plumber & Carpenter',
    icon: '/categories/electrician.svg?v=4',
    defaultEta: 44,
    matchKeywords: ['electric', 'plumb', 'carpent', 'handyman', 'repair', 'installation']
  }
];

// All services structured by category & subcategory (matching Urban Company reference screenshots)
const ALL_SERVICES_SECTIONS = [
  {
    id: 'womens-salon-spa',
    title: "Women's Salon & Spa",
    items: [
      {
        id: 'salon-for-women',
        title: 'Salon for Women',
        icon: '/categories/womens-salon.png?v=4',
        isAvatar: true,
        eta: 55,
        slug: 'womens-salon',
        matchKeywords: ['women', 'salon', 'beauty', 'facial', 'wax']
      },
      {
        id: 'spa-for-women',
        title: 'Spa for Women',
        icon: '/categories/spa-women.svg?v=4',
        eta: null,
        slug: 'womens-spa',
        matchKeywords: ['spa', 'massage', 'women']
      },
      {
        id: 'hair-studio-for-women',
        title: 'Hair Studio for Women',
        icon: '/categories/hair-dryer.svg?v=4',
        eta: null,
        slug: 'hair-studio',
        matchKeywords: ['hair', 'salon', 'women']
      }
    ]
  },
  {
    id: 'mens-salon-massage',
    title: "Men's Salon & Massage",
    items: [
      {
        id: 'salon-for-men',
        title: 'Salon for Men',
        icon: '/categories/mens-salon.png?v=4',
        isAvatar: true,
        eta: null,
        slug: 'mens-salon',
        matchKeywords: ['men', 'salon', 'grooming', 'haircut']
      },
      {
        id: 'massage-for-men',
        title: 'Massage for Men',
        icon: '/categories/massage-men.svg?v=4',
        eta: null,
        slug: 'mens-massage',
        matchKeywords: ['massage', 'men']
      }
    ]
  },
  {
    id: 'cleaning-section',
    title: 'Cleaning',
    items: [
      {
        id: 'bathroom-kitchen-cleaning',
        title: 'Bathroom & Kitchen Cleaning',
        icon: '/categories/bathroom-sink.svg?v=4',
        eta: null,
        slug: 'cleaning',
        matchKeywords: ['bathroom', 'kitchen', 'cleaning']
      },
      {
        id: 'sofa-carpet-cleaning',
        title: 'Sofa & Carpet Cleaning',
        icon: '/categories/sofa-cleaning.svg?v=4',
        eta: 88,
        slug: 'cleaning',
        matchKeywords: ['sofa', 'carpet', 'cleaning']
      }
    ]
  },
  {
    id: 'ac-appliance-repair',
    title: 'AC & Appliance Repair',
    subsections: [
      {
        title: 'Large appliances',
        gridCols: 'grid-cols-3',
        items: [
          {
            id: 'ac-repair',
            title: 'AC',
            icon: '/categories/ac-appliance.svg?v=4',
            eta: 44,
            slug: 'ac',
            matchKeywords: ['ac', 'air condition']
          },
          {
            id: 'washing-machine-repair',
            title: 'Washing Machine',
            icon: '/ServiceIcon/washing-machine.svg?v=4',
            eta: 64,
            slug: 'washing-machine',
            matchKeywords: ['washing machine', 'washer']
          },
          {
            id: 'refrigerator-repair',
            title: 'Refrigerator Repair',
            icon: '/ServiceIcon/refrigerator.svg?v=4',
            eta: 64,
            slug: 'fridge',
            matchKeywords: ['fridge', 'refrigerator']
          }
        ]
      },
      {
        title: 'Other appliances',
        gridCols: 'grid-cols-4',
        items: [
          {
            id: 'chimney-repair',
            title: 'Chimney',
            icon: '/ServiceIcon/chimney.svg?v=4',
            eta: null,
            slug: 'kitchen-chimney',
            matchKeywords: ['chimney', 'kitchen chimney']
          },
          {
            id: 'microwave-repair',
            title: 'Microwave',
            icon: '/ServiceIcon/microwave.svg?v=4',
            eta: 64,
            slug: 'microwave',
            matchKeywords: ['microwave']
          },
          {
            id: 'ro-purifier-repair',
            title: 'RO/Water Purifier',
            icon: '/ServiceIcon/ro-purifier.svg?v=4',
            eta: null,
            slug: 'ro-prufier',
            matchKeywords: ['ro-prufier', 'prufier', 'purifier', 'ro']
          },
          {
            id: 'geyser-repair',
            title: 'Geyser',
            icon: '/ServiceIcon/water-heater.svg?v=4',
            eta: null,
            slug: 'geyser',
            matchKeywords: ['geyser', 'water heater']
          }
        ]
      }
    ]
  },
  {
    id: 'electrician-plumber-carpenter',
    title: 'Electrician, Plumber & Carpenter',
    subsections: [
      {
        title: 'Home repairs',
        gridCols: 'grid-cols-3',
        items: [
          {
            id: 'electrician-repair',
            title: 'Electrician',
            icon: '/categories/electrician-switch.svg?v=4',
            eta: 44,
            slug: 'electrician-services',
            matchKeywords: ['electric', 'electrician']
          },
          {
            id: 'plumber-repair',
            title: 'Plumber',
            icon: '/categories/plumber-toilet.svg?v=4',
            eta: 44,
            slug: 'plumber',
            matchKeywords: ['plumb', 'plumber']
          },
          {
            id: 'carpenter-repair',
            title: 'Carpenter',
            icon: '/categories/carpenter-door.svg?v=4',
            eta: 44,
            slug: 'carpenter',
            matchKeywords: ['carpent', 'carpenter']
          }
        ]
      },
      {
        title: 'Home installation',
        gridCols: 'grid-cols-3',
        items: [
          {
            id: 'furniture-assembly',
            title: 'Furniture Assembly',
            icon: '/categories/furniture-assembly.svg?v=4',
            eta: null,
            slug: 'furniture-assembly',
            matchKeywords: ['furniture', 'carpenter', 'assembly']
          },
          {
            id: 'geyser-service-repair',
            title: 'Geyser Service & Repair',
            icon: '/ServiceIcon/water-heater.svg?v=4',
            eta: null,
            slug: 'geyser',
            matchKeywords: ['geyser', 'water heater']
          }
        ]
      }
    ]
  }
];

const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = url.replace('/api/upload', '/upload');
  if (clean.startsWith('http') || clean.startsWith('/categories') || clean.startsWith('/ServiceIcon') || clean.startsWith('/')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const readStoredCoords = () => {
  try {
    const raw = localStorage.getItem('userCoords');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.lat === 'number' && typeof parsed?.lng === 'number') return parsed;
  } catch { /* ignore */ }
  return null;
};

// Bottom-centered white pill badge matching screenshot exactly
const EtaBadge = ({ minutes }) => (
  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 bg-white px-2 py-0.5 rounded-[6px] shadow-sm border border-gray-100/90 pointer-events-none z-10">
    <span className="text-[11px] sm:text-[12px] font-semibold text-[#0B7D5C] whitespace-nowrap leading-tight tracking-tight">
      {minutes} mins
    </span>
  </div>
);

const TILE_BOX_CLASSES = 'relative w-full aspect-[4/3] rounded-2xl bg-[#F2F3F5] overflow-hidden flex items-center justify-center transition-transform duration-200 active:scale-[0.96] group shadow-[0_1px_2px_rgba(0,0,0,0.02)]';

const ServiceTile = ({ title, icon, etaMinutes, isAvatar = false, onClick, compact = false }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center text-center w-full focus:outline-none group cursor-pointer"
    >
      <div className={TILE_BOX_CLASSES}>
        {icon ? (
          <img
            src={icon}
            alt={title}
            className={`${
              isAvatar
                ? 'w-[80%] h-[80%] object-contain group-hover:scale-105'
                : 'w-[74%] h-[74%] object-contain group-hover:scale-105'
            } transition-transform duration-300 pointer-events-none select-none`}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-white/70" />
        )}
        {typeof etaMinutes === 'number' && etaMinutes > 0 && <EtaBadge minutes={etaMinutes} />}
      </div>
      <span
        className={`mt-1.5 font-medium text-[#1A1D20] leading-[1.25] text-center line-clamp-2 px-0.5 ${
          compact ? 'text-[11px] sm:text-[12px]' : 'text-[12px] sm:text-[13px]'
        }`}
      >
        {title}
      </span>
    </button>
  );
};

const AllServicesTile = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex flex-col items-center text-center w-full focus:outline-none group cursor-pointer"
  >
    <div className={TILE_BOX_CLASSES}>
      <img
        src="/categories/all-services.svg?v=4"
        alt="All services"
        className="w-[36%] h-[36%] object-contain transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
        decoding="async"
      />
    </div>
    <span className="mt-2 text-[13px] sm:text-[14px] font-medium text-[#1A1D20] leading-[1.25] text-center line-clamp-2 px-0.5">
      All services
    </span>
  </button>
);

// Match an item to a real database category object
const matchToDatabaseCategory = (item, categories) => {
  if (!Array.isArray(categories) || categories.length === 0) {
    return { id: item.id, title: item.title, slug: item.slug, icon: item.icon };
  }
  const itemSlug = (item.slug || '').toLowerCase();
  const directMatch = categories.find(
    (c) =>
      (c.slug && c.slug.toLowerCase() === itemSlug) ||
      c.id === item.id ||
      c._id === item.id
  );
  if (directMatch) {
    return { ...directMatch, title: item.title || directMatch.title, slug: item.slug || directMatch.slug, icon: item.icon };
  }

  if (Array.isArray(item.matchKeywords)) {
    for (const kw of item.matchKeywords) {
      const kwLower = kw.toLowerCase();
      const found = categories.find(
        (c) =>
          (c.title || '').toLowerCase().includes(kwLower) ||
          (c.slug || '').toLowerCase().includes(kwLower)
      );
      if (found) {
        return { ...found, title: item.title || found.title, slug: item.slug || found.slug, icon: item.icon };
      }
    }
  }

  return { id: item.id, title: item.title, slug: item.slug, icon: item.icon };
};

// =========================================================================
// Category-Specific Bottom Sheet (Exact match to screenshots 1 & 2)
// Opens when a user taps ANY top service tile (e.g. Women's Salon or AC)
// =========================================================================
const CategorySpecificSheet = ({ section, categories, etaMap, onPick, onClose }) => {
  const content = (
    <AnimatePresence>
      {Boolean(section) && (
        <>
          {/* Backdrop */}
          <motion.div
            key="category-scrim"
            className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Bottom Sheet Container */}
          <motion.div
            key="category-sheet"
            className="fixed inset-x-0 bottom-0 z-[9999] pointer-events-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
          >
            {/* Close Button Floating on top-right right above the white card */}
            <div className="relative w-full max-w-lg mx-auto">
              <div className="absolute -top-12 right-4 z-[10000]">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white shadow-xl flex items-center justify-center text-gray-800 hover:bg-gray-100 transition-transform active:scale-95 cursor-pointer"
                  aria-label="Close"
                >
                  <FiX className="w-5 h-5 text-gray-800 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* White Sheet Box */}
            <div className="bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col w-full max-w-lg mx-auto overflow-hidden">
              {/* Modal Title */}
              <div className="px-5 pt-5 pb-1">
                <h3 className="text-[20px] sm:text-[22px] font-bold text-[#111827] tracking-tight">
                  {section.title}
                </h3>
              </div>

              {/* Sheet Body Content */}
              <div className="overflow-y-auto px-5 pt-3 pb-8 space-y-4">
                {/* Direct Items (e.g. Women's Salon, Men's Salon, Cleaning) */}
                {Array.isArray(section.items) && (
                  <div className="grid grid-cols-3 gap-3.5">
                    {section.items.map((item) => {
                      const resolvedCat = matchToDatabaseCategory(item, categories);
                      const liveEta = etaMap[resolvedCat?.id] || etaMap[item.id] || item.eta;
                      return (
                        <ServiceTile
                          key={item.id}
                          title={item.title}
                          icon={item.icon}
                          isAvatar={item.isAvatar}
                          etaMinutes={liveEta}
                          onClick={() => {
                            onPick(resolvedCat);
                            onClose();
                          }}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Subsections (e.g. Large appliances, Other appliances, Home repairs) */}
                {Array.isArray(section.subsections) && (
                  <div className="space-y-4">
                    {section.subsections.map((sub) => (
                      <div key={sub.title} className="space-y-2">
                        <h4 className="text-[15px] sm:text-[16px] font-semibold text-[#1F2937]">
                          {sub.title}
                        </h4>
                        <div className={`grid ${sub.gridCols || 'grid-cols-3'} gap-2.5`}>
                          {sub.items.map((item) => {
                            const resolvedCat = matchToDatabaseCategory(item, categories);
                            const liveEta = etaMap[resolvedCat?.id] || etaMap[item.id] || item.eta;
                            return (
                              <ServiceTile
                                key={item.id}
                                title={item.title}
                                icon={item.icon}
                                compact={sub.gridCols === 'grid-cols-4'}
                                etaMinutes={liveEta}
                                onClick={() => {
                                  onPick(resolvedCat);
                                  onClose();
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};

// =========================================================================
// Grouped All Services Drawer (Triggered by the 6th "All services" tile)
// =========================================================================
const AllServicesSheet = ({ open, categories = [], etaMap = {}, onPick, onClose }) => {
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (open) {
      setAddress(localStorage.getItem('currentAddress') || 'Select Location');
    }
  }, [open]);

  const content = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="all-scrim"
            className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            key="all-sheet"
            className="fixed inset-x-0 bottom-0 z-[9999] pointer-events-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
          >
            <div className="bg-white rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl w-full max-w-lg mx-auto overflow-hidden">
              {/* Top Sheet Drag Pill */}
              <div className="pt-2.5 pb-1 flex justify-center">
                <div className="w-10 h-1 rounded-full bg-gray-300" />
              </div>

              {/* Header: Location & Close Button */}
              <div className="px-5 pt-1 pb-3 flex items-center justify-between border-b border-gray-100">
                <div className="flex items-center gap-2.5 min-w-0 pr-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                    <FiMapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] font-bold text-[#0B7D5C] tracking-tight leading-none">
                      In 44 minutes
                    </div>
                    <div className="flex items-center gap-1 text-[13px] font-medium text-gray-700 truncate mt-0.5">
                      <span className="truncate">{address}</span>
                      <FiChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors shrink-0 cursor-pointer"
                  aria-label="Close"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Grouped Categories Content */}
              <div className="overflow-y-auto px-5 py-5 space-y-7">
                {ALL_SERVICES_SECTIONS.map((section, sIdx) => (
                  <div key={section.id} className="space-y-3">
                    <h3 className="text-[19px] sm:text-[20px] font-bold text-[#111827] tracking-tight">
                      {section.title}
                    </h3>

                    {/* Direct Items */}
                    {Array.isArray(section.items) && (
                      <div className="grid grid-cols-3 gap-3">
                        {section.items.map((item) => {
                          const resolvedCat = matchToDatabaseCategory(item, categories);
                          const liveEta = etaMap[resolvedCat?.id] || etaMap[item.id] || item.eta;
                          return (
                            <ServiceTile
                              key={item.id}
                              title={item.title}
                              icon={item.icon}
                              isAvatar={item.isAvatar}
                              etaMinutes={liveEta}
                              onClick={() => {
                                onPick(resolvedCat);
                                onClose();
                              }}
                            />
                          );
                        })}
                      </div>
                    )}

                    {/* Subsections */}
                    {Array.isArray(section.subsections) && (
                      <div className="space-y-4">
                        {section.subsections.map((sub) => (
                          <div key={sub.title} className="space-y-2">
                            <h4 className="text-[15px] font-semibold text-[#1F2937]">
                              {sub.title}
                            </h4>
                            <div className={`grid ${sub.gridCols || 'grid-cols-3'} gap-2.5`}>
                              {sub.items.map((item) => {
                                const resolvedCat = matchToDatabaseCategory(item, categories);
                                const liveEta = etaMap[resolvedCat?.id] || etaMap[item.id] || item.eta;
                                return (
                                  <ServiceTile
                                    key={item.id}
                                    title={item.title}
                                    icon={item.icon}
                                    compact={sub.gridCols === 'grid-cols-4'}
                                    etaMinutes={liveEta}
                                    onClick={() => {
                                      onPick(resolvedCat);
                                      onClose();
                                    }}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Divider line except after last section */}
                    {sIdx < ALL_SERVICES_SECTIONS.length - 1 && (
                      <div className="border-b border-gray-100/90 pt-3" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};

// =========================================================================
// Top Primary Category Tiles Component
// =========================================================================
const ServiceCategories = React.memo(({ categories = [], onCategoryClick }) => {
  const [etaMap, setEtaMap] = useState({});
  const [showAll, setShowAll] = useState(false);
  const [activeCategorySheet, setActiveCategorySheet] = useState(null);
  const fetchedKeyRef = useRef(null);

  // Fetch live per-category arrival time once we know user's coords
  useEffect(() => {
    const coords = readStoredCoords();
    if (!coords) return;
    const key = `${coords.lat.toFixed(2)}|${coords.lng.toFixed(2)}`;
    if (fetchedKeyRef.current === key) return;
    fetchedKeyRef.current = key;

    let cancelled = false;
    publicCatalogService
      .getCategoriesEta({ lat: coords.lat, lng: coords.lng })
      .then((res) => {
        if (!cancelled && res?.eta) setEtaMap(res.eta);
      })
      .catch(() => { /* badges stay hidden on failure */ });
    return () => {
      cancelled = true;
    };
  }, [categories?.length]);

  // Handle clicking one of the top primary category tiles
  const handlePrimaryClick = (item) => {
    const section = ALL_SERVICES_SECTIONS.find((s) => s.id === item.sectionId);
    if (section) {
      setActiveCategorySheet(section);
    } else {
      const resolved = matchToDatabaseCategory(item, categories);
      onCategoryClick?.(resolved);
    }
  };

  return (
    <div className="px-4 sm:px-5 pt-3 pb-2">
      {/* 2x3 grid matching screenshot exactly */}
      <div className="grid grid-cols-3 gap-x-3 gap-y-4">
        {PRIMARY_SERVICES.map((item) => {
          const resolvedCat = matchToDatabaseCategory(item, categories);
          const liveEta = etaMap[resolvedCat?.id] || etaMap[item.id] || item.defaultEta;
          const isAvatar = item.id === 'womens-salon' || item.id === 'mens-salon';

          return (
            <ServiceTile
              key={item.id}
              title={item.title}
              icon={item.icon}
              etaMinutes={liveEta}
              isAvatar={isAvatar}
              onClick={() => handlePrimaryClick(item)}
            />
          );
        })}

        {/* 6th Slot: All services */}
        <AllServicesTile onClick={() => setShowAll(true)} />
      </div>

      {/* Specific Category Bottom Sheet (Opens when tapping any top tile) */}
      <CategorySpecificSheet
        section={activeCategorySheet}
        categories={categories}
        etaMap={etaMap}
        onPick={(cat) => onCategoryClick?.(cat)}
        onClose={() => setActiveCategorySheet(null)}
      />

      {/* Grouped Drawer matching Urban Company reference (Opens when tapping "All services") */}
      <AllServicesSheet
        open={showAll}
        categories={categories}
        etaMap={etaMap}
        onPick={(cat) => onCategoryClick?.(cat)}
        onClose={() => setShowAll(false)}
      />
    </div>
  );
});

ServiceCategories.displayName = 'ServiceCategories';

export default ServiceCategories;
