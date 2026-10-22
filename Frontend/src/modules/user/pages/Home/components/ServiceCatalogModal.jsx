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
import { publicCatalogService } from '../../../../../services/catalogService';
import { getCategoryIllustration } from '../../../utils/categoryIcons';
import { toast } from 'react-hot-toast';

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
// Default fallback is a neutral tool SVG rather than salon avatar so other categories never show women salon avatars!
const ImageWithFallback = ({ src, alt, className, fallback = '/categories/electrician-switch.svg' }) => {
  const [imgSrc, setImgSrc] = useState(src || fallback);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImgSrc(src || fallback);
    setHasError(false);
  }, [src, fallback]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        if (!hasError) {
          setHasError(true);
          setImgSrc(fallback);
        }
      }}
    />
  );
};

// =========================================================================
// Curated Clean & Professional Catalog Data
// =========================================================================

const CATALOG_DATA = {
  'womens-salon': {
    title: 'Salon Luxe',
    etaMinutes: 55,
    rating: '4.89',
    bookings: '2.2 M bookings',
    hero: {
      tag: 'New launch',
      title: 'Japanese glow rituals',
      startingPrice: '1,999',
      image: '/noteworthy/salon-luxe.jpg'
    },
    coupon: {
      title: 'Get 25% off upto 200',
      subtitle: 'For new salon users',
      code: 'SALON25'
    },
    subCategories: [
      { id: 'packages', title: 'Super saver packages', badge: 'Upto 20% OFF' },
      { id: 'waxing', title: 'Waxing & threading', icon: '/services/spatula-waxing.jpg' },
      { id: 'japanese', title: 'Japanese & Korean rituals', badge: 'New', icon: '/services/hair-studio-facial.jpg' },
      { id: 'facials', title: 'Signature facial', icon: '/services/signature-facial.jpg' },
      { id: 'cleanup', title: 'Cleanup', icon: '/noteworthy/salon-luxe.jpg' },
      { id: 'pedi-mani', title: 'Pedicure & manicure', icon: '/categories/spa-women.svg' },
      { id: 'bleach-massage', title: 'Bleach & massage', icon: '/categories/womens-salon.png' }
    ],
    sections: [
      {
        id: 'packages',
        title: 'Super saver packages',
        items: [
          {
            id: 'pkg-make-your-own',
            title: 'Make your own package',
            isPackage: true,
            rating: '4.90',
            reviews: '1.5M reviews',
            price: 4675,
            originalPrice: 5844,
            discount: '20% OFF',
            duration: '4 hrs 5 mins',
            image: '/noteworthy/salon-luxe.jpg',
            bullets: [
              'Waxing: Full arms - Jasmine roll-on wax, Full legs - Jasmine roll-on wax',
              'Facial & cleanup: Yuzu vitamin glow ritual',
              'Manicure & pedicure: Signature Mani-Pedi Combo - with heel peel',
              'Facial hair removal: Threading - Eyebrows - Threading, Upper lip - Threading'
            ]
          },
          {
            id: 'pkg-wax-glow',
            title: 'Wax & glow',
            isPackage: true,
            rating: '4.90',
            reviews: '1.3M reviews',
            price: 3396,
            originalPrice: 3995,
            discount: '15% OFF',
            duration: '2 hrs 35 mins',
            image: '/services/spatula-waxing.jpg',
            bullets: [
              'Waxing: Full arms - Jasmine roll-on, Full legs - Jasmine roll-on wax',
              'Facials: Yuzu vitamin glow ritual',
              'Facial hair removal: Threading - Eyebrows - Threading, Upper lip - Threading'
            ]
          },
          {
            id: 'pkg-monthly-maintenance',
            title: 'Monthly maintenance package',
            isPackage: true,
            rating: '4.90',
            reviews: '1.3M reviews',
            price: 2497,
            originalPrice: 2799,
            discount: '10% OFF',
            duration: '1 hr 30 mins',
            image: '/services/signature-facial.jpg',
            bullets: [
              'Cleanup & facial: Yuzu vitamin glow ritual',
              'Facial hair removal: Threading - Eyebrows - Threading, Upper lip - Threading'
            ]
          }
        ]
      },
      {
        id: 'waxing',
        title: 'Waxing & threading',
        bannerPromo: {
          title: 'Spatula waxing starting at ₹1,039',
          originalPrice: 1499,
          subtitle: 'Full arms, legs & underarms',
          image: '/services/spatula-waxing.jpg'
        },
        items: [
          {
            id: 'wax-roll-on-combo',
            title: 'Roll-on waxing (Full arms & legs, underarm)',
            rating: '4.91',
            reviews: '38K reviews',
            price: 1399,
            originalPrice: 1699,
            discount: '18% OFF',
            duration: '1 hr 10 mins',
            optionsCount: '3 options',
            image: '/services/spatula-waxing.jpg',
            bullets: [
              'Choose from a range of Roll-on wax options',
              'Cirepil intimate peel-off wax would be used for underarms'
            ],
            detailsNote: 'Pain-free cartridge waxing, leaves skin silky smooth without stickiness.'
          },
          {
            id: 'wax-honey-spatula',
            title: 'Honey Waxing (Full Arms + Full Legs)',
            rating: '4.88',
            reviews: '210K reviews',
            price: 649,
            originalPrice: 799,
            discount: '19% OFF',
            duration: '50 mins',
            optionsCount: '2 options',
            image: '/services/spatula-waxing.jpg',
            bullets: [
              '100% natural organic honey & lemon formulation',
              'Includes soothing post-wax aloe vera massage'
            ]
          },
          {
            id: 'threading-eyebrow-upperlip',
            title: 'Eyebrow & Upper Lip Threading',
            rating: '4.92',
            reviews: '450K reviews',
            price: 99,
            originalPrice: 149,
            duration: '15 mins',
            image: '/services/threading.jpg',
            bullets: [
              'Precision shaping with antiseptic cotton thread',
              'Calming ice roller or rose water application'
            ]
          }
        ]
      },
      {
        id: 'japanese',
        title: 'Japanese & Korean rituals',
        items: [
          {
            id: 'facial-korean-glass',
            title: 'Korean Glass Skin Ritual Facial',
            isPackage: true,
            rating: '4.94',
            reviews: '85K reviews',
            price: 1999,
            originalPrice: 2499,
            discount: '20% OFF',
            duration: '1 hr 15 mins',
            image: '/services/hair-studio-facial.jpg',
            bullets: [
              '7-step Korean hydration & pore vacuum therapy',
              'Fermented rice water essence + dual peptide sheet mask',
              'Ice globe cold lymphatic face massage'
            ]
          },
          {
            id: 'facial-japanese-yuzu',
            title: 'Japanese Yuzu Vitamin Glow Ritual',
            rating: '4.91',
            reviews: '62K reviews',
            price: 1699,
            originalPrice: 2099,
            discount: '19% OFF',
            duration: '60 mins',
            image: '/services/signature-facial.jpg',
            bullets: [
              'Yuzu fruit high-potency Vitamin C antioxidant infusion',
              'Thermal herbal compress with relaxing neck & shoulder massage'
            ]
          }
        ]
      },
      {
        id: 'facials',
        title: 'Signature facial',
        items: [
          {
            id: 'facial-o3-plus-glow',
            title: 'O3+ Bridal Brightening & Detan Facial',
            rating: '4.89',
            reviews: '340K reviews',
            price: 1499,
            originalPrice: 1899,
            discount: '21% OFF',
            duration: '70 mins',
            image: '/services/signature-facial.jpg',
            bullets: [
              'O3+ genuine single-use sealed salon professional kit',
              'Deep peel off rubber mask for high-definition glow'
            ]
          },
          {
            id: 'facial-gold-radiance',
            title: '24K Pure Gold Radiance Facial',
            rating: '4.87',
            reviews: '120K reviews',
            price: 1299,
            originalPrice: 1599,
            discount: '18% OFF',
            duration: '60 mins',
            image: '/services/hair-studio-facial.jpg',
            bullets: [
              'Gold leaf infusion for cell renewal and radiant glow',
              'Deep exfoliation with gentle galvanic massager'
            ]
          }
        ]
      },
      {
        id: 'cleanup',
        title: 'Cleanup',
        items: [
          {
            id: 'cleanup-active-detan',
            title: 'Active Detan Face & Neck Cleanup',
            rating: '4.86',
            reviews: '95K reviews',
            price: 599,
            originalPrice: 749,
            discount: '20% OFF',
            duration: '35 mins',
            image: '/noteworthy/salon-luxe.jpg',
            bullets: [
              'Clove & eucalyptus steam and blackhead vacuuming',
              'Kojic acid detan mask with cooling towel wrap'
            ]
          }
        ]
      },
      {
        id: 'pedi-mani',
        title: 'Pedicure & manicure',
        items: [
          {
            id: 'mani-pedi-deluxe',
            title: 'Signature Mani-Pedi Combo with Heel Peel',
            rating: '4.91',
            reviews: '280K reviews',
            price: 999,
            originalPrice: 1299,
            discount: '23% OFF',
            duration: '1 hr 15 mins',
            image: '/categories/spa-women.svg',
            bullets: [
              'Deep cuticle care, gentle sea-salt scrub & callus scraping',
              'Relaxing hand and foot lavender cream massage'
            ]
          }
        ]
      }
    ]
  },

  'ac-repair': {
    title: 'AC Service and Repair',
    etaMinutes: 45,
    rating: '4.86',
    bookings: '3.1 M bookings',
    hero: {
      tag: 'Power Saver',
      title: 'Power Jet Deep Clean',
      startingPrice: '499',
      image: '/services/ac-repair.jpg'
    },
    coupon: {
      title: 'Get 20% off on 2+ ACs',
      subtitle: 'Applicable automatically at checkout',
      code: 'COOL20'
    },
    subCategories: [
      { id: 'packages', title: 'Super saver packages', badge: 'Upto 25% OFF' },
      { id: 'jet-service', title: 'Service & deep clean', icon: '/services/ac-repair.jpg' },
      { id: 'repair-gas', title: 'Repair & gas refill', icon: '/categories/ac-appliance.svg' },
      { id: 'install-uninstall', title: 'Install & uninstall', icon: '/categories/ac-appliance.svg' }
    ],
    sections: [
      {
        id: 'packages',
        title: 'Super saver packages',
        items: [
          {
            id: 'ac-pkg-complete-tuneup',
            title: 'Complete AC Tune-Up & Jet Wash Combo',
            isPackage: true,
            rating: '4.89',
            reviews: '850K reviews',
            price: 999,
            originalPrice: 1399,
            discount: '28% OFF',
            duration: '1 hr 15 mins',
            image: '/services/ac-repair.jpg',
            bullets: [
              'High-pressure power jet wash of indoor and outdoor cooling coils',
              'Gas pressure verification with digital manifold gauge',
              'Drain tray anti-fungal disinfection & 30-day warranty'
            ]
          },
          {
            id: 'ac-pkg-dual-saver',
            title: '2x Split AC Power Jet Service Combo',
            isPackage: true,
            rating: '4.91',
            reviews: '410K reviews',
            price: 899,
            originalPrice: 1198,
            discount: '25% OFF',
            duration: '1 hr 45 mins',
            image: '/services/ac-repair.jpg',
            bullets: [
              'Servicing for 2 split ACs with high pressure water jacket',
              'Saves up to 25% on summer electricity bills'
            ]
          }
        ]
      },
      {
        id: 'jet-service',
        title: 'Service & deep clean',
        bannerPromo: {
          title: 'Power Jet Service starting at ₹499',
          originalPrice: 699,
          subtitle: 'Indoor & outdoor deep coil wash with anti-fungal treatment',
          image: '/services/ac-repair.jpg'
        },
        items: [
          {
            id: 'ac-split-jet-service',
            title: 'Power Jet Service (Split AC)',
            rating: '4.87',
            reviews: '1.2M reviews',
            price: 499,
            originalPrice: 649,
            discount: '23% OFF',
            duration: '45 mins',
            image: '/services/ac-repair.jpg',
            bullets: [
              'High-pressure water pump cleans hidden dirt behind cooling fins',
              'Includes waterproof jacket so walls remain 100% clean and dry'
            ]
          },
          {
            id: 'ac-window-jet-service',
            title: 'Power Jet Service (Window AC)',
            rating: '4.84',
            reviews: '320K reviews',
            price: 449,
            originalPrice: 599,
            discount: '25% OFF',
            duration: '40 mins',
            image: '/services/ac-repair.jpg',
            bullets: [
              'Full external coil degreasing & blower wheel dust extraction'
            ]
          }
        ]
      },
      {
        id: 'repair-gas',
        title: 'Repair & gas refill',
        items: [
          {
            id: 'ac-gas-charging',
            title: 'Complete Gas Refill & Leak Fix',
            isPackage: true,
            rating: '4.88',
            reviews: '290K reviews',
            price: 1899,
            originalPrice: 2400,
            discount: '20% OFF',
            duration: '1 hr 30 mins',
            image: '/services/ac-repair.jpg',
            bullets: [
              'Nitrogen pressure test to locate micro-cracks in copper pipes',
              'Pure R32 / R410A / R22 refrigerant filling by weight',
              'Includes 60 days cooling warranty'
            ]
          },
          {
            id: 'ac-general-checkup',
            title: 'AC Diagnosis & Inspection Visit',
            rating: '4.81',
            reviews: '180K reviews',
            price: 199,
            originalPrice: 299,
            duration: '30 mins',
            image: '/services/ac-repair.jpg',
            bullets: [
              'Comprehensive inspection for water leakage, noise, or cooling issues',
              'Visit charge fully adjusted if any repair is booked'
            ]
          }
        ]
      },
      {
        id: 'install-uninstall',
        title: 'Install & uninstall',
        items: [
          {
            id: 'ac-split-installation',
            title: 'Split AC Installation',
            rating: '4.86',
            reviews: '190K reviews',
            price: 799,
            originalPrice: 999,
            discount: '20% OFF',
            duration: '1 hr 30 mins',
            image: '/services/ac-repair.jpg',
            bullets: [
              'Precision wall drilling, indoor unit mounting, and outdoor bracket fixing',
              'Vacuum pumping and gas leakage check before commissioning'
            ]
          },
          {
            id: 'ac-uninstallation',
            title: 'AC Uninstallation',
            rating: '4.85',
            reviews: '80K reviews',
            price: 399,
            originalPrice: 499,
            duration: '45 mins',
            image: '/services/ac-repair.jpg',
            bullets: [
              'Safe refrigerant lock inside compressor to prevent gas loss'
            ]
          }
        ]
      }
    ]
  },

  'cleaning': {
    title: 'Cleaning & Pest Control',
    etaMinutes: 60,
    rating: '4.84',
    bookings: '1.8 M bookings',
    hero: {
      tag: 'Hospital Grade',
      title: 'Deep Home Disinfection',
      startingPrice: '499',
      image: '/cleaning-essentials/intense-bathroom.jpg'
    },
    coupon: {
      title: 'Get 25% off upto 200',
      subtitle: 'On your first home deep clean',
      code: 'CLEAN25'
    },
    subCategories: [
      { id: 'packages', title: 'Super saver packages', badge: 'Upto 25% OFF' },
      { id: 'bathroom', title: 'Bathroom cleaning', icon: '/services/intense-bathroom-cleaning.jpg' },
      { id: 'kitchen', title: 'Kitchen deep clean', icon: '/services/kitchen-deep-cleaning.jpg' },
      { id: 'sofa-carpet', title: 'Sofa & upholstery', icon: '/services/sofa-cleaning.jpg' }
    ],
    sections: [
      {
        id: 'packages',
        title: 'Super saver packages',
        items: [
          {
            id: 'clean-pkg-full-home',
            title: 'Full Home Deep Renewal Package',
            isPackage: true,
            rating: '4.89',
            reviews: '310K reviews',
            price: 2499,
            originalPrice: 3499,
            discount: '28% OFF',
            duration: '4 hrs',
            image: '/cleaning-essentials/intense-bathroom.jpg',
            bullets: [
              '2 Bathrooms intense descaling + Full kitchen grease removal',
              'Living room & balcony mechanized floor scrubbing with single disc machine',
              'Cobweb removal, window glass buffing & switchboard wiping'
            ]
          },
          {
            id: 'clean-pkg-bath-kitchen',
            title: 'Bathroom & Kitchen Glow Combo',
            isPackage: true,
            rating: '4.87',
            reviews: '240K reviews',
            price: 1199,
            originalPrice: 1498,
            discount: '20% OFF',
            duration: '2 hrs 30 mins',
            image: '/services/kitchen-deep-cleaning.jpg',
            bullets: [
              '1 Bathroom deep clean + 1 Complete modular kitchen deep scrub',
              'Removes 100% yellow hard water tile stains and cooking grease'
            ]
          }
        ]
      },
      {
        id: 'bathroom',
        title: 'Bathroom cleaning',
        bannerPromo: {
          title: 'Intense bathroom cleaning from ₹499',
          originalPrice: 699,
          subtitle: 'Hard water tile descaling, taps chrome buffing & toilet sanitation',
          image: '/services/intense-bathroom-cleaning.jpg'
        },
        items: [
          {
            id: 'clean-intense-1-bath',
            title: 'Intense Bathroom Cleaning (1 Bathroom)',
            rating: '4.81',
            reviews: '8.8M reviews',
            price: 499,
            originalPrice: 599,
            duration: '50 mins',
            image: '/services/intense-bathroom-cleaning.jpg',
            bullets: [
              'Non-acidic chemical scrubbing prevents damage to tiles & grout',
              'Mirror buffing, WC bowl sanitization, exhaust fan wiping'
            ]
          },
          {
            id: 'clean-intense-2-bath',
            title: 'Intense Cleaning (2 Bathrooms)',
            rating: '4.81',
            reviews: '7.6M reviews',
            price: 923,
            originalPrice: 998,
            discount: '8% OFF',
            duration: '1 hr 40 mins',
            image: '/services/intense-cleaning-2-bathroom.jpg',
            bullets: [
              'Complete treatment for 2 bathrooms including tile scaling removal'
            ]
          }
        ]
      },
      {
        id: 'kitchen',
        title: 'Kitchen deep clean',
        items: [
          {
            id: 'clean-kitchen-deep',
            title: 'Kitchen Deep Cleaning',
            rating: '4.78',
            reviews: '420K reviews',
            price: 799,
            originalPrice: 999,
            discount: '20% OFF',
            duration: '1 hr 30 mins',
            image: '/services/kitchen-deep-cleaning.jpg',
            bullets: [
              'Chimney exterior, gas stove burners, wall tiles and cabinet degreasing',
              'Sink drain sanitization and cockroach prevention spray'
            ]
          }
        ]
      },
      {
        id: 'sofa-carpet',
        title: 'Sofa & upholstery',
        items: [
          {
            id: 'clean-sofa-shampoo',
            title: 'Sofa Deep Cleaning (3 Seater)',
            rating: '4.86',
            reviews: '555K reviews',
            price: 499,
            originalPrice: 699,
            discount: '28% OFF',
            duration: '1 hr',
            image: '/services/sofa-cleaning.jpg',
            bullets: [
              'High-suction dry vacuuming extracts deep dust mites and allergens',
              'Wet shampoo foam extraction removes stubborn fabric stains'
            ]
          }
        ]
      }
    ]
  },

  'washing-machine': {
    title: 'Washing Machine Repair & Service',
    etaMinutes: 60,
    rating: '4.82',
    bookings: '1.4 M bookings',
    hero: {
      tag: 'Doorstep Fix',
      title: 'Expert Washer Care',
      startingPrice: '299',
      image: '/services/washing-machine.jpg'
    },
    coupon: {
      title: 'Get ₹150 off on repairs',
      subtitle: 'Use code WASH150 on checkout',
      code: 'WASH150'
    },
    subCategories: [
      { id: 'packages', title: 'Super saver packages', badge: 'Upto 20% OFF' },
      { id: 'service', title: 'Service & descaling', icon: '/services/washing-machine.jpg' },
      { id: 'repairs', title: 'Drum & spin repairs', icon: '/ServiceIcon/washing-machine.svg' }
    ],
    sections: [
      {
        id: 'packages',
        title: 'Super saver packages',
        items: [
          {
            id: 'wm-pkg-annual-care',
            title: 'Annual Washer Care & Descaling Combo',
            isPackage: true,
            rating: '4.88',
            reviews: '210K reviews',
            price: 950,
            originalPrice: 1199,
            discount: '20% OFF',
            duration: '1 hr 15 mins',
            image: '/services/washing-machine.jpg',
            bullets: [
              'Machine drum chemical descaling removes lime-scale buildup',
              'Inlet valve filter cleaning + drain pump unclogging',
              'Complete motor, belt & PCB electrical audit with 30-day warranty'
            ]
          }
        ]
      },
      {
        id: 'service',
        title: 'Service & descaling',
        items: [
          {
            id: 'wm-general-checkup',
            title: 'Comprehensive Diagnosis & Inspection',
            rating: '4.79',
            reviews: '3.7M reviews',
            price: 299,
            duration: '30 mins',
            image: '/services/washing-machine.jpg',
            bullets: [
              'Complete fault detection for sound, vibration, error codes, water leakage',
              'Inspection fee adjusted against final repair cost'
            ]
          },
          {
            id: 'wm-drainage-fix',
            title: 'Water Drain / Inlet Pipe Repair',
            rating: '4.82',
            reviews: '90K reviews',
            price: 449,
            originalPrice: 599,
            discount: '25% OFF',
            duration: '45 mins',
            image: '/services/washing-machine.jpg',
            bullets: [
              'Clears trapped coins/debris from drain pump or replaces damaged pipe'
            ]
          }
        ]
      },
      {
        id: 'repairs',
        title: 'Drum & spin repairs',
        items: [
          {
            id: 'wm-drum-vibration',
            title: 'Excessive Vibration & Noise Repair',
            rating: '4.84',
            reviews: '130K reviews',
            price: 599,
            originalPrice: 799,
            discount: '25% OFF',
            duration: '1 hr',
            image: '/services/washing-machine.jpg',
            bullets: [
              'Suspension rods adjustment and counterweight balancing'
            ]
          }
        ]
      }
    ]
  },

  'water-purifier': {
    title: 'Native Water Purifier Service',
    etaMinutes: 50,
    rating: '4.87',
    bookings: '920K bookings',
    hero: {
      tag: '100% Pure',
      title: 'RO Complete Servicing',
      startingPrice: '399',
      image: '/noteworthy/water-purifier.jpg'
    },
    coupon: {
      title: 'Get 20% off on Filter Combo',
      subtitle: 'Free water TDS testing included',
      code: 'PURE20'
    },
    subCategories: [
      { id: 'packages', title: 'Complete annual packages', badge: 'Upto 25% OFF' },
      { id: 'service', title: 'General service & TDS', icon: '/services/water-purifier.jpg' },
      { id: 'filters', title: 'Filter replacement', icon: '/noteworthy/water-purifier.jpg' }
    ],
    sections: [
      {
        id: 'packages',
        title: 'Complete annual packages',
        items: [
          {
            id: 'ro-pkg-annual-filters',
            title: 'Annual Filter Replacement Combo',
            isPackage: true,
            rating: '4.91',
            reviews: '150K reviews',
            price: 1899,
            originalPrice: 2499,
            discount: '24% OFF',
            duration: '1 hr',
            image: '/noteworthy/water-purifier.jpg',
            bullets: [
              'Includes Spun Pre-Filter + Sediment Filter + Carbon Block + Post Carbon',
              'Internal tank antibacterial sanitization',
              'Includes free before-and-after TDS testing with calibrated meter'
            ]
          }
        ]
      },
      {
        id: 'service',
        title: 'General service & TDS',
        items: [
          {
            id: 'ro-service-regular',
            title: 'Comprehensive RO Servicing',
            rating: '4.85',
            reviews: '410K reviews',
            price: 399,
            originalPrice: 499,
            discount: '20% OFF',
            duration: '40 mins',
            image: '/noteworthy/water-purifier.jpg',
            bullets: [
              'Full tank wash, membrane pressure test, and pipe leak verification'
            ]
          }
        ]
      },
      {
        id: 'filters',
        title: 'Filter replacement',
        items: [
          {
            id: 'ro-pre-filter-change',
            title: 'External Pre-Filter (Spun Candle) Change',
            rating: '4.89',
            reviews: '280K reviews',
            price: 349,
            originalPrice: 450,
            duration: '20 mins',
            image: '/noteworthy/water-purifier.jpg',
            bullets: [
              'High density 5-micron PP spun candle removes mud, sand & rust'
            ]
          }
        ]
      }
    ]
  },

  'electrician-services': {
    title: 'Electrician',
    etaMinutes: 44,
    rating: '4.85',
    bookings: '2.5 M bookings',
    hero: {
      tag: 'Certified Pros',
      title: 'Quick Home Repairs',
      startingPrice: '99',
      image: '/services/switch-socket.jpg'
    },
    coupon: {
      title: 'Flat ₹100 off on ₹399+',
      subtitle: 'Applicable on all electrician bookings',
      code: 'ELEC100'
    },
    subCategories: [
      { id: 'electrical', title: 'Switches & sockets', icon: '/categories/electrician-switch.svg' },
      { id: 'fans', title: 'Fan install & repair', icon: '/services/fan-repair.jpg' },
      { id: 'mcb', title: 'MCB & fuse', icon: '/categories/electrician-switch.svg' },
      { id: 'wiring', title: 'Inverter & wiring', icon: '/categories/electrician-switch.svg' }
    ],
    sections: [
      {
        id: 'electrical',
        title: 'Switches & sockets',
        items: [
          {
            id: 'elec-switch-install',
            title: 'Switch / Socket Replacement',
            rating: '4.85',
            reviews: '890K reviews',
            price: 99,
            originalPrice: 149,
            duration: '15 mins',
            image: '/services/switch-socket.jpg',
            bullets: [
              'Installation of modular/non-modular switches or 16A power sockets',
              'Live phase testing and insulated safety fitting'
            ]
          },
          {
            id: 'elec-switchboard-repair',
            title: 'Switchboard Repair / Installation',
            rating: '4.82',
            reviews: '340K reviews',
            price: 199,
            originalPrice: 299,
            duration: '30 mins',
            image: '/categories/electrician-switch.svg',
            bullets: [
              'Complete modular board fixing, internal wiring and master switch check'
            ]
          }
        ]
      },
      {
        id: 'fans',
        title: 'Fan install & repair',
        items: [
          {
            id: 'elec-fan-install',
            title: 'Ceiling Fan Installation',
            rating: '4.85',
            reviews: '99K reviews',
            price: 200,
            originalPrice: 400,
            discount: '50% OFF',
            duration: '30 mins',
            image: '/services/fan-repair.jpg',
            bullets: [
              'Secure hook mounting, downrod connection, blade assembly & speed testing'
            ]
          },
          {
            id: 'elec-fan-repair',
            title: 'Fan Repair (Capacitor / Regulator)',
            rating: '4.82',
            reviews: '160K reviews',
            price: 149,
            originalPrice: 199,
            duration: '25 mins',
            image: '/services/fan-repair.jpg',
            bullets: [
              'Fixes slow spinning speed, humming noise, or jerky rotation'
            ]
          },
          {
            id: 'elec-exhaust-fan',
            title: 'Exhaust Fan Installation',
            rating: '4.80',
            reviews: '85K reviews',
            price: 199,
            originalPrice: 249,
            duration: '30 mins',
            image: '/services/fan-repair.jpg',
            bullets: [
              'Kitchen or bathroom glass/wall exhaust mounting with sealed wiring'
            ]
          }
        ]
      },
      {
        id: 'mcb',
        title: 'MCB & fuse',
        items: [
          {
            id: 'elec-mcb-replacement',
            title: 'MCB / Fuse Replacement',
            rating: '4.88',
            reviews: '120K reviews',
            price: 199,
            originalPrice: 299,
            duration: '30 mins',
            image: '/categories/electrician-switch.svg',
            bullets: [
              'Single or double pole MCB replacement for overload tripping issues'
            ]
          },
          {
            id: 'elec-sub-meter',
            title: 'Sub-meter / Changeover Switch Installation',
            rating: '4.84',
            reviews: '45K reviews',
            price: 349,
            originalPrice: 499,
            duration: '45 mins',
            image: '/categories/electrician-switch.svg',
            bullets: [
              'Heavy amp sub-meter wiring with phase indicator safety test'
            ]
          }
        ]
      },
      {
        id: 'wiring',
        title: 'Inverter & wiring',
        items: [
          {
            id: 'elec-inverter-install',
            title: 'Inverter Installation & Battery Setup',
            rating: '4.89',
            reviews: '95K reviews',
            price: 499,
            originalPrice: 699,
            duration: '45 mins',
            image: '/categories/electrician-switch.svg',
            bullets: [
              'Pure sine wave inverter connection, distilled water check & backup test'
            ]
          },
          {
            id: 'elec-room-wiring',
            title: 'Short Circuit / Internal Wiring Fix',
            rating: '4.86',
            reviews: '180K reviews',
            price: 299,
            originalPrice: 399,
            duration: '40 mins',
            image: '/categories/electrician-switch.svg',
            bullets: [
              'Traces open neutral or phase leakages with digital multimeter'
            ]
          }
        ]
      }
    ]
  },

  'plumber': {
    title: 'Plumber',
    etaMinutes: 44,
    rating: '4.86',
    bookings: '1.9 M bookings',
    hero: {
      tag: 'Verified Plumbers',
      title: 'Plumbing & Water Leak Repairs',
      startingPrice: '149',
      image: '/categories/plumber-toilet.svg'
    },
    coupon: {
      title: 'Flat ₹100 off on ₹399+',
      subtitle: 'Applicable on all plumbing bookings',
      code: 'PLUMB100'
    },
    subCategories: [
      { id: 'plumb-taps', title: 'Tap & mixer', icon: '/categories/plumber-toilet.svg' },
      { id: 'plumb-toilet', title: 'Toilet & flush', icon: '/categories/plumber-toilet.svg' },
      { id: 'plumb-drain', title: 'Drain & basin', icon: '/categories/bathroom-sink.svg' },
      { id: 'plumb-motor', title: 'Water tank & motor', icon: '/categories/plumber-toilet.svg' }
    ],
    sections: [
      {
        id: 'plumb-taps',
        title: 'Tap & mixer',
        items: [
          {
            id: 'plumb-tap-repair',
            title: 'Tap / Mixer Repair & Installation',
            rating: '4.86',
            reviews: '410K reviews',
            price: 149,
            originalPrice: 199,
            duration: '30 mins',
            image: '/categories/plumber-toilet.svg',
            bullets: [
              'Fixes persistent dripping, washer wear, or replaces mixer spindle'
            ]
          },
          {
            id: 'plumb-jet-spray',
            title: 'Jet Spray & Hand Shower Installation',
            rating: '4.88',
            reviews: '290K reviews',
            price: 129,
            originalPrice: 179,
            duration: '20 mins',
            image: '/categories/plumber-toilet.svg',
            bullets: [
              'Brass braided angle valve connection with Teflon tape seal'
            ]
          }
        ]
      },
      {
        id: 'plumb-toilet',
        title: 'Toilet & flush',
        items: [
          {
            id: 'plumb-flush-tank',
            title: 'Toilet Flush Tank Repair',
            rating: '4.81',
            reviews: '95K reviews',
            price: 249,
            originalPrice: 349,
            duration: '40 mins',
            image: '/categories/plumber-toilet.svg',
            bullets: [
              'Syphon or inlet ballcock valve repair for non-stop tank filling'
            ]
          },
          {
            id: 'plumb-seat-cover',
            title: 'Toilet Seat Cover Replacement',
            rating: '4.81',
            reviews: '110K reviews',
            price: 149,
            originalPrice: 199,
            duration: '25 mins',
            image: '/categories/plumber-toilet.svg',
            bullets: [
              'Soft close or hydraulic seat hinge calibration and tight screw fix'
            ]
          }
        ]
      },
      {
        id: 'plumb-drain',
        title: 'Drain & basin',
        items: [
          {
            id: 'plumb-drain-block',
            title: 'Drain / Basin Blockage Removal',
            rating: '4.87',
            reviews: '520K reviews',
            price: 199,
            originalPrice: 299,
            duration: '30 mins',
            image: '/categories/bathroom-sink.svg',
            bullets: [
              'Heavy-duty chemical pipe unclogging & manual snake wire drain clean'
            ]
          },
          {
            id: 'plumb-waste-pipe',
            title: 'Wash Basin Waste Pipe Replacement',
            rating: '4.85',
            reviews: '180K reviews',
            price: 149,
            originalPrice: 199,
            duration: '25 mins',
            image: '/categories/bathroom-sink.svg',
            bullets: [
              'Flexible corrugated pipe replacement with anti-smell trap'
            ]
          }
        ]
      },
      {
        id: 'plumb-motor',
        title: 'Water tank & motor',
        items: [
          {
            id: 'plumb-water-motor',
            title: 'Water Pump / Motor Connection',
            rating: '4.84',
            reviews: '90K reviews',
            price: 299,
            originalPrice: 399,
            duration: '45 mins',
            image: '/categories/plumber-toilet.svg',
            bullets: [
              'Suction & delivery pipe union fitting and foot valve air release'
            ]
          }
        ]
      }
    ]
  },

  'carpenter': {
    title: 'Carpenter',
    etaMinutes: 44,
    rating: '4.87',
    bookings: '1.4 M bookings',
    hero: {
      tag: 'Carpentry Experts',
      title: 'Precision Woodwork & Repairs',
      startingPrice: '149',
      image: '/categories/carpenter-door.svg'
    },
    coupon: {
      title: 'Flat ₹100 off on ₹399+',
      subtitle: 'Applicable on carpentry bookings',
      code: 'WOOD100'
    },
    subCategories: [
      { id: 'carp-door', title: 'Door lock & handle', icon: '/categories/carpenter-door.svg' },
      { id: 'carp-furniture', title: 'Furniture assembly', icon: '/categories/furniture-assembly.svg' },
      { id: 'carp-window', title: 'Window & drawer', icon: '/categories/carpenter-door.svg' }
    ],
    sections: [
      {
        id: 'carp-door',
        title: 'Door lock & handle',
        items: [
          {
            id: 'carp-door-lock',
            title: 'Door Lock / Handle Repair',
            rating: '4.87',
            reviews: '110K reviews',
            price: 249,
            originalPrice: 349,
            duration: '45 mins',
            image: '/categories/carpenter-door.svg',
            bullets: [
              'Mortise / cylindrical lock fitting or sticking latch realignment'
            ]
          },
          {
            id: 'carp-door-hinge',
            title: 'Door Hinge & Stopper Repair',
            rating: '4.82',
            reviews: '110K reviews',
            price: 149,
            originalPrice: 199,
            duration: '25 mins',
            image: '/categories/carpenter-door.svg',
            bullets: [
              'Fixes dragging door, loose screws or replaces creaking brass hinges'
            ]
          }
        ]
      },
      {
        id: 'carp-furniture',
        title: 'Furniture assembly',
        items: [
          {
            id: 'carp-furniture-assembly',
            title: 'Furniture Assembly (Table / Chair / Shelf)',
            rating: '4.89',
            reviews: '75K reviews',
            price: 399,
            originalPrice: 499,
            duration: '1 hr',
            image: '/categories/furniture-assembly.svg',
            bullets: [
              'Precision IKEA / engineered wood furniture flat-pack assembly'
            ]
          },
          {
            id: 'carp-bed-assembly',
            title: 'Bed / Cot / Wardrobe Assembly',
            rating: '4.91',
            reviews: '92K reviews',
            price: 699,
            originalPrice: 899,
            duration: '1 hr 30 mins',
            image: '/categories/furniture-assembly.svg',
            bullets: [
              'Hydraulic storage bed frame alignment & wardrobe hinges fitting'
            ]
          }
        ]
      },
      {
        id: 'carp-window',
        title: 'Window & drawer',
        items: [
          {
            id: 'carp-drawer-channel',
            title: 'Drawer Channel / Slider Repair',
            rating: '4.83',
            reviews: '65K reviews',
            price: 199,
            originalPrice: 249,
            duration: '30 mins',
            image: '/categories/carpenter-door.svg',
            bullets: [
              'Smooth telescopic channel replacement for kitchen & wardrobe drawers'
            ]
          }
        ]
      }
    ]
  },

  'mens-salon': {
    title: "Men's Salon & Grooming",
    etaMinutes: 50,
    rating: '4.88',
    bookings: '1.6 M bookings',
    hero: {
      tag: 'Executive',
      title: 'Gentleman Grooming',
      startingPrice: '249',
      image: '/categories/mens-salon.png'
    },
    coupon: {
      title: 'Flat ₹100 off on Combos',
      subtitle: 'Single use sanitized kit guaranteed',
      code: 'MEN100'
    },
    subCategories: [
      { id: 'packages', title: 'Super saver packages', badge: 'Upto 30% OFF', icon: '/categories/mens-salon.png' },
      { id: 'haircut', title: 'Haircut & beard', icon: '/categories/mens-salon.png' },
      { id: 'detan-facial', title: 'Detan & facial', icon: '/categories/mens-salon.png' },
      { id: 'massage', title: 'Head & body massage', icon: '/categories/massage-men.svg' }
    ],
    sections: [
      {
        id: 'packages',
        title: 'Super saver packages',
        items: [
          {
            id: 'men-pkg-makeover',
            title: "Gentleman's Full Makeover Package",
            isPackage: true,
            rating: '4.92',
            reviews: '180K reviews',
            price: 899,
            originalPrice: 1299,
            discount: '30% OFF',
            duration: '1 hr 15 mins',
            image: '/categories/mens-salon.png',
            bullets: [
              'Men\'s Designer Haircut + Beard Shaping & Styling',
              'O3+ Detan Face Pack & Scrub for sun protection',
              '15-min relaxing stress-relief head massage'
            ]
          },
          {
            id: 'men-pkg-cut-beard',
            title: 'Haircut + Beard Trim Combo',
            isPackage: true,
            rating: '4.89',
            reviews: '420K reviews',
            price: 399,
            originalPrice: 499,
            discount: '20% OFF',
            duration: '45 mins',
            image: '/categories/mens-salon.png',
            bullets: [
              'Custom haircut suited to your face shape',
              'Beard lining with straight razor finish and soothing aftershave'
            ]
          }
        ]
      },
      {
        id: 'haircut',
        title: 'Haircut & beard',
        items: [
          {
            id: 'men-haircut-classic',
            title: "Men's Precision Haircut & Styling",
            rating: '4.87',
            reviews: '920K reviews',
            price: 249,
            originalPrice: 299,
            duration: '30 mins',
            image: '/categories/mens-salon.png',
            bullets: [
              'Single-use towel, sanitized scissors & clipper guards',
              'Finishing hair wash and styling pomade application'
            ]
          },
          {
            id: 'men-beard-styling',
            title: 'Beard Shaping & Styling',
            rating: '4.86',
            reviews: '310K reviews',
            price: 199,
            originalPrice: 249,
            duration: '20 mins',
            image: '/categories/mens-salon.png',
            bullets: [
              'Sharp razor lining and nourishing beard oil massage'
            ]
          }
        ]
      },
      {
        id: 'detan-facial',
        title: 'Detan & facial',
        items: [
          {
            id: 'men-o3-detan',
            title: 'O3+ Instant Tan Removal Pack',
            rating: '4.91',
            reviews: '140K reviews',
            price: 499,
            originalPrice: 650,
            discount: '23% OFF',
            duration: '35 mins',
            image: '/categories/mens-salon.png',
            bullets: [
              'Removes deep pollution and sunburn marks with herbal active agents'
            ]
          }
        ]
      },
      {
        id: 'massage',
        title: 'Head & body massage',
        items: [
          {
            id: 'men-deep-tissue-massage',
            title: 'Deep Tissue Full Body Massage (60 Mins)',
            rating: '4.93',
            reviews: '95K reviews',
            price: 1299,
            originalPrice: 1699,
            discount: '23% OFF',
            duration: '60 mins',
            image: '/categories/mens-salon.png',
            bullets: [
              'Warm sesame/olive oil targeting tight muscles and back fatigue',
              'Disposable sheets and portable massage mat provided by professional'
            ]
          }
        ]
      }
    ]
  },
  'fan-repair': {
    title: 'Fan Repair & Installation',
    etaMinutes: 30,
    rating: '4.89',
    bookings: '5.5 M bookings',
    hero: {
      tag: 'Fan Specialists',
      title: 'Ceiling, Exhaust & BLDC Fan Services',
      startingPrice: '149',
      image: '/services/fan-repair.jpg'
    },
    coupon: {
      title: 'Flat ₹75 off on Fan repair',
      subtitle: 'Applicable on repairs & installs',
      code: 'FAN75'
    },
    subCategories: [
      { id: 'fan-ceiling', title: 'Ceiling Fan', icon: '/services/fan-repair.jpg' },
      { id: 'fan-exhaust', title: 'Exhaust Fan', icon: '/services/fan-repair.jpg' },
      { id: 'fan-bldc', title: 'BLDC & Remote Fans', icon: '/services/fan-repair.jpg' }
    ],
    sections: [
      {
        id: 'fan-ceiling',
        title: 'Ceiling Fan Services',
        items: [
          {
            id: 'fan-repair-check',
            title: 'Ceiling Fan Repair & Capacitor Check',
            rating: '4.88',
            reviews: '1.2M reviews',
            price: 149,
            originalPrice: 199,
            duration: '30 mins',
            image: '/services/fan-repair.jpg',
            bullets: [
              'Capacitor testing, bearing noise troubleshooting & wobble alignment',
              'Speed regulation check and safe ceiling hook inspection'
            ]
          },
          {
            id: 'fan-install-ceiling',
            title: 'Ceiling Fan Installation / Replacement',
            rating: '4.89',
            reviews: '2.4M reviews',
            price: 199,
            originalPrice: 299,
            duration: '40 mins',
            image: '/services/fan-repair.jpg',
            bullets: [
              'Secure ceiling hook mounting, safety downrod clamp & balance calibration',
              'Blade angle balancing for vibration-free maximum airflow'
            ]
          },
          {
            id: 'fan-regulator-fix',
            title: 'Fan Regulator Switch Replacement',
            rating: '4.85',
            reviews: '450K reviews',
            price: 99,
            originalPrice: 149,
            duration: '20 mins',
            image: '/services/fan-repair.jpg',
            bullets: [
              'Smooth rotary speed knob replacement and hum-free connection',
              'Modular step regulator installation'
            ]
          }
        ]
      },
      {
        id: 'fan-exhaust',
        title: 'Exhaust Fan Services',
        items: [
          {
            id: 'fan-exhaust-install',
            title: 'Exhaust Fan Installation',
            rating: '4.84',
            reviews: '680K reviews',
            price: 199,
            originalPrice: 249,
            duration: '30 mins',
            image: '/services/fan-repair.jpg',
            bullets: [
              'Kitchen or bathroom duct/glass louvre mounting with sealed wiring',
              'Backdraft shutter check to block outdoor pests and odors'
            ]
          },
          {
            id: 'fan-exhaust-repair',
            title: 'Exhaust Fan Repair & Blade Cleaning',
            rating: '4.82',
            reviews: '320K reviews',
            price: 149,
            originalPrice: 199,
            duration: '25 mins',
            image: '/services/fan-repair.jpg',
            bullets: [
              'Grease removal, blade alignment and jammed motor revivification',
              'Bearing lubrication for whisper-quiet ventilation'
            ]
          }
        ]
      },
      {
        id: 'fan-bldc',
        title: 'BLDC & Remote Fans',
        items: [
          {
            id: 'fan-bldc-install',
            title: 'BLDC Smart Remote Fan Installation',
            rating: '4.91',
            reviews: '410K reviews',
            price: 299,
            originalPrice: 399,
            duration: '45 mins',
            image: '/services/fan-repair.jpg',
            bullets: [
              'Electronic driver mounting, RF remote sync and 5-star power connection',
              'Timer mode and sleep mode configuration'
            ]
          },
          {
            id: 'fan-wall-table',
            title: 'Wall Mounted / Table Fan Repair',
            rating: '4.83',
            reviews: '180K reviews',
            price: 149,
            originalPrice: 199,
            duration: '30 mins',
            image: '/services/fan-repair.jpg',
            bullets: [
              'Oscillation swing mechanism fix and wire rewinding',
              'Motor thermal fuse safety replacement'
            ]
          }
        ]
      }
    ]
  },

  'home-wiring': {
    title: 'Home Wiring & Protection',
    etaMinutes: 40,
    rating: '4.86',
    bookings: '3.2 M bookings',
    hero: {
      tag: 'Certified Electricians',
      title: 'Short Circuit, Earthing & House Wiring',
      startingPrice: '299',
      image: '/services/electrical/home-wiring.jpg'
    },
    coupon: {
      title: 'Save ₹150 on House Wiring',
      subtitle: 'Certified electrician visit',
      code: 'WIRE150'
    },
    subCategories: [
      { id: 'wire-fault', title: 'Short Circuit & Earthing', icon: '/services/electrical/home-wiring.jpg' },
      { id: 'wire-house', title: 'Room & Internal Wiring', icon: '/services/electrical/home-wiring.jpg' },
      { id: 'wire-appliance', title: 'Heavy Power Point', icon: '/services/electrical/home-wiring.jpg' }
    ],
    sections: [
      {
        id: 'wire-fault',
        title: 'Short Circuit & Earthing',
        items: [
          {
            id: 'wire-short-circuit',
            title: 'Short Circuit & Sparking Troubleshooting',
            rating: '4.90',
            reviews: '850K reviews',
            price: 299,
            originalPrice: 449,
            duration: '45 mins',
            image: '/services/electrical/home-wiring.jpg',
            bullets: [
              'Digital multimeter testing, open neutral diagnosis & burn cable isolation',
              'Identification of hidden wall wire spark points and immediate safe bypass'
            ]
          },
          {
            id: 'wire-earthing',
            title: 'Ground Earthing Installation / Repair',
            rating: '4.87',
            reviews: '280K reviews',
            price: 499,
            originalPrice: 699,
            duration: '60 mins',
            image: '/services/electrical/home-wiring.jpg',
            bullets: [
              'Copper plate earthing check to prevent mild electric shocks from appliances',
              'Main electrical earth electrode resistance testing'
            ]
          }
        ]
      },
      {
        id: 'wire-house',
        title: 'Room & Internal Wiring',
        items: [
          {
            id: 'wire-room-casing',
            title: 'Room Internal Wiring (Per Room)',
            rating: '4.88',
            reviews: '540K reviews',
            price: 999,
            originalPrice: 1499,
            duration: '90 mins',
            image: '/services/electrical/home-wiring.jpg',
            bullets: [
              'Conduit casing / concealed FR grade PVC wire pulling and connection',
              'Load distribution across separate phases to prevent power dips'
            ]
          },
          {
            id: 'wire-new-light-point',
            title: 'New Light / Fan Internal Wiring Point',
            rating: '4.85',
            reviews: '620K reviews',
            price: 249,
            originalPrice: 349,
            duration: '35 mins',
            image: '/services/electrical/home-wiring.jpg',
            bullets: [
              'Fire-resistant ISI certified wire extension with neat clipping',
              'Secure terminal connection at main switchboard'
            ]
          }
        ]
      },
      {
        id: 'wire-appliance',
        title: 'Heavy Power Points',
        items: [
          {
            id: 'wire-ac-geyser-point',
            title: '16A AC / Geyser Heavy Line Wiring',
            rating: '4.89',
            reviews: '720K reviews',
            price: 399,
            originalPrice: 549,
            duration: '45 mins',
            image: '/services/electrical/home-wiring.jpg',
            bullets: [
              '4 sq mm heavy duty copper cable with individual safety breaker',
              'Prevents wire heating and switch melting during peak winter/summer load'
            ]
          }
        ]
      }
    ]
  },

  'inverter': {
    title: 'Inverter & Battery Services',
    etaMinutes: 45,
    rating: '4.87',
    bookings: '2.8 M bookings',
    hero: {
      tag: 'Backup Specialists',
      title: 'Inverter Installation, Repair & Battery Care',
      startingPrice: '199',
      image: '/services/electrical/inverter.jpg'
    },
    coupon: {
      title: 'Flat ₹100 off on Inverter setup',
      subtitle: 'Any repair or battery setup',
      code: 'INVERTER100'
    },
    subCategories: [
      { id: 'inv-repair', title: 'Inverter Repair', icon: '/services/electrical/inverter.jpg' },
      { id: 'inv-install', title: 'Installation & Setup', icon: '/services/electrical/inverter.jpg' },
      { id: 'inv-battery', title: 'Battery Health', icon: '/services/electrical/inverter.jpg' }
    ],
    sections: [
      {
        id: 'inv-repair',
        title: 'Inverter Repair & Diagnostics',
        items: [
          {
            id: 'inv-not-charging',
            title: 'Inverter Not Charging / Beeping Issue',
            rating: '4.86',
            reviews: '420K reviews',
            price: 299,
            originalPrice: 399,
            duration: '40 mins',
            image: '/services/electrical/inverter.jpg',
            bullets: [
              'Motherboard relay test, fuse replacement & transformer diagnostics',
              'Charging current calibration to avoid battery bulging'
            ]
          },
          {
            id: 'inv-tripping-fix',
            title: 'Inverter Overload & Trip Repair',
            rating: '4.88',
            reviews: '310K reviews',
            price: 249,
            originalPrice: 349,
            duration: '35 mins',
            image: '/services/electrical/inverter.jpg',
            bullets: [
              'Bypass switch testing, load calibration and output socket check',
              'Internal fan cleaning to prevent overheat shutdowns'
            ]
          }
        ]
      },
      {
        id: 'inv-install',
        title: 'Installation & Setup',
        items: [
          {
            id: 'inv-new-setup',
            title: 'New Inverter & Battery Installation',
            rating: '4.91',
            reviews: '650K reviews',
            price: 499,
            originalPrice: 699,
            duration: '50 mins',
            image: '/services/electrical/inverter.jpg',
            bullets: [
              'Heavy battery terminal clamping, acid safety tray placement & earthing connection',
              'Home main DB phase separation for emergency backup lines'
            ]
          },
          {
            id: 'inv-relocation',
            title: 'Inverter & Battery Uninstallation / Relocation',
            rating: '4.84',
            reviews: '190K reviews',
            price: 349,
            originalPrice: 499,
            duration: '40 mins',
            image: '/services/electrical/inverter.jpg',
            bullets: [
              'Safe disconnect, terminal insulation and reconnect at new spot',
              'Prevents battery acid spill and short circuit accidents'
            ]
          }
        ]
      },
      {
        id: 'inv-battery',
        title: 'Battery Health & Maintenance',
        items: [
          {
            id: 'inv-water-topup',
            title: 'Battery Distilled Water Top-up & Terminal Cleanup',
            rating: '4.89',
            reviews: '530K reviews',
            price: 149,
            originalPrice: 199,
            duration: '25 mins',
            image: '/services/electrical/inverter.jpg',
            bullets: [
              'Float level checking, sulfuric crystallization cleaning & petroleum jelly coat',
              'Gravity specific check with hydrometer for backup longevity'
            ]
          }
        ]
      }
    ]
  },

  'mcb': {
    title: 'MCB & Distribution Board',
    etaMinutes: 35,
    rating: '4.88',
    bookings: '1.9 M bookings',
    hero: {
      tag: 'Short Circuit Protection',
      title: 'MCB Replacement, Sub-Meters & DB Box',
      startingPrice: '149',
      image: '/services/electrical/mcb.jpg'
    },
    coupon: {
      title: '₹80 OFF on Electrical Safety',
      subtitle: 'MCB & fuse repair',
      code: 'MCB80'
    },
    subCategories: [
      { id: 'mcb-breakers', title: 'MCB Replacement', icon: '/services/electrical/mcb.jpg' },
      { id: 'mcb-db', title: 'Main DB & Changeover', icon: '/services/electrical/mcb.jpg' }
    ],
    sections: [
      {
        id: 'mcb-breakers',
        title: 'MCB Replacement & Tripping',
        items: [
          {
            id: 'mcb-single-pole',
            title: 'Single Pole MCB Replacement (6A - 32A)',
            rating: '4.89',
            reviews: '480K reviews',
            price: 149,
            originalPrice: 199,
            duration: '25 mins',
            image: '/services/electrical/mcb.jpg',
            bullets: [
              'Overload tripping fix, DIN rail snap-in & heat-resistant connection',
              'Fixes constant tripping on AC or geyser turn-on'
            ]
          },
          {
            id: 'mcb-double-pole',
            title: 'Double Pole (DP) / ELCB / RCCB Installation',
            rating: '4.92',
            reviews: '340K reviews',
            price: 299,
            originalPrice: 399,
            duration: '40 mins',
            image: '/services/electrical/mcb.jpg',
            bullets: [
              '30mA earth leakage circuit breaker test to protect humans against shock',
              'Master isolator switch replacement for entire house'
            ]
          }
        ]
      },
      {
        id: 'mcb-db',
        title: 'Main DB, Sub-Meter & Changeover',
        items: [
          {
            id: 'mcb-changeover',
            title: 'Generator / Mains Changeover Switch Install',
            rating: '4.87',
            reviews: '210K reviews',
            price: 349,
            originalPrice: 499,
            duration: '45 mins',
            image: '/services/electrical/mcb.jpg',
            bullets: [
              'Rotary manual or motorized changeover switch wiring with phase safety',
              'Smooth switching between grid power and backup generator'
            ]
          },
          {
            id: 'mcb-submeter',
            title: 'Sub-Meter Installation',
            rating: '4.85',
            reviews: '160K reviews',
            price: 349,
            originalPrice: 499,
            duration: '40 mins',
            image: '/services/electrical/mcb.jpg',
            bullets: [
              'Analog or digital sub-meter for tenant / floor-wise unit calculation',
              'Accurate calibration and tamper-proof wire seal'
            ]
          }
        ]
      }
    ]
  },

  'switches-sockets': {
    title: 'Switches & Sockets',
    etaMinutes: 30,
    rating: '4.88',
    bookings: '4.1 M bookings',
    hero: {
      tag: 'Modular Electrical',
      title: 'Switch, Socket & Modular Board Repair',
      startingPrice: '99',
      image: '/services/switch-socket.jpg'
    },
    coupon: {
      title: 'Save ₹50 on Switchboards',
      subtitle: 'Any switch or socket repair',
      code: 'SWITCH50'
    },
    subCategories: [
      { id: 'sw-replace', title: 'Switch & Socket', icon: '/categories/electrician-switch.svg' },
      { id: 'sw-board', title: 'Switchboard Repair', icon: '/categories/electrician-switch.svg' }
    ],
    sections: [
      {
        id: 'sw-replace',
        title: 'Switch & Socket Replacement',
        items: [
          {
            id: 'sw-single',
            title: 'Switch / Socket Replacement (up to 2)',
            rating: '4.88',
            reviews: '1.4M reviews',
            price: 99,
            originalPrice: 149,
            duration: '20 mins',
            image: '/services/switch-socket.jpg',
            bullets: [
              'Tight screw terminal clamping, spark-free testing and plate fitment',
              'Fixes loose contacts and burning plastic smells'
            ]
          },
          {
            id: 'sw-power-16a',
            title: '16A Heavy Power Socket Installation',
            rating: '4.89',
            reviews: '980K reviews',
            price: 149,
            originalPrice: 199,
            duration: '25 mins',
            image: '/services/switch-socket.jpg',
            bullets: [
              'High-load socket for microwave, refrigerator, or iron box with earthing',
              'Heat-resistant polycarbonate socket with safety child shutter'
            ]
          }
        ]
      },
      {
        id: 'sw-board',
        title: 'Switchboard Repair & Automation',
        items: [
          {
            id: 'sw-board-repair',
            title: 'Switchboard Internal Rewiring & Fix',
            rating: '4.86',
            reviews: '620K reviews',
            price: 199,
            originalPrice: 299,
            duration: '35 mins',
            image: '/services/switch-socket.jpg',
            bullets: [
              'Burned wire clean up, modular gang box alignment & safety fuse check',
              'Eliminates intermittent loose electrical connections'
            ]
          },
          {
            id: 'sw-smart-module',
            title: 'Smart WiFi Switch Module Installation',
            rating: '4.91',
            reviews: '240K reviews',
            price: 249,
            originalPrice: 349,
            duration: '35 mins',
            image: '/services/switch-socket.jpg',
            bullets: [
              'WiFi automation module fitting behind existing board with app pairing',
              'Voice assistant and smartphone scheduling control'
            ]
          }
        ]
      }
    ]
  },

  'tap-repair': {
    title: 'Tap & Faucet Repair',
    etaMinutes: 35,
    rating: '4.89',
    bookings: '2.5 M bookings',
    hero: {
      tag: 'Plumbing Solutions',
      title: 'Tap Leaks, Washers & Mixer Faucets',
      startingPrice: '99',
      image: '/services/tap-repair.jpg'
    },
    coupon: {
      title: '₹75 OFF on Tap Repair',
      subtitle: 'On any tap or valve repair',
      code: 'TAP75'
    },
    subCategories: [
      { id: 'tap-leaks', title: 'Tap & Faucet Repair', icon: '/services/tap-repair.jpg' },
      { id: 'tap-install', title: 'Tap Installation', icon: '/services/tap-repair.jpg' }
    ],
    sections: [
      {
        id: 'tap-leaks',
        title: 'Tap Repair & Leaks',
        items: [
          {
            id: 'tap-water-leak',
            title: 'Water Tap Repair & Leakage Fix',
            rating: '4.89',
            reviews: '820K reviews',
            price: 99,
            originalPrice: 149,
            duration: '25 mins',
            image: '/services/tap-repair.jpg',
            bullets: [
              'Spindle replacement, Teflon tape sealing & ceramic disc washer fix',
              'Stops non-stop dripping and fixes tight or jammed handles'
            ]
          },
          {
            id: 'tap-mixer-repair',
            title: 'Wall Mixer / Sink Mixer Tap Repair',
            rating: '4.87',
            reviews: '340K reviews',
            price: 199,
            originalPrice: 299,
            duration: '35 mins',
            image: '/services/tap-repair.jpg',
            bullets: [
              'Hot & cold water cartridge replacement, pressure balancing and o-ring seal',
              'Restores balanced hot and cold water mixing without leaks'
            ]
          }
        ]
      },
      {
        id: 'tap-install',
        title: 'Tap & Faucet Installation',
        items: [
          {
            id: 'tap-new-install',
            title: 'New Tap / Faucet Installation',
            rating: '4.88',
            reviews: '610K reviews',
            price: 149,
            originalPrice: 199,
            duration: '25 mins',
            image: '/services/tap-repair.jpg',
            bullets: [
              'Pillar tap, bib tap, or angle valve installation with leak-proof testing',
              'Chrome flange alignment and silicone sealing around sink rim'
            ]
          },
          {
            id: 'tap-health-faucet',
            title: 'Jet Spray / Health Faucet Installation',
            rating: '4.86',
            reviews: '490K reviews',
            price: 149,
            originalPrice: 199,
            duration: '25 mins',
            image: '/services/tap-repair.jpg',
            bullets: [
              'Flexible braided hose connection, wall hook mounting and high pressure test',
              'Heavy brass nut tightening to prevent burst hoses'
            ]
          }
        ]
      }
    ]
  },

  'geyser': {
    title: 'Geyser & Water Heater',
    etaMinutes: 40,
    rating: '4.88',
    bookings: '3.1 M bookings',
    hero: {
      tag: 'Winter Essential',
      title: 'Geyser Repair, Heating Element & Service',
      startingPrice: '199',
      image: '/services/geyser-repair.jpg'
    },
    coupon: {
      title: 'Flat ₹100 off on Geyser repair',
      subtitle: 'Electric & instant geysers',
      code: 'GEYSER100'
    },
    subCategories: [
      { id: 'gey-repair', title: 'Geyser Repair', icon: '/ServiceIcon/water-heater.svg' },
      { id: 'gey-install', title: 'Installation & Descaling', icon: '/ServiceIcon/water-heater.svg' }
    ],
    sections: [
      {
        id: 'gey-repair',
        title: 'Geyser Repair & Diagnostics',
        items: [
          {
            id: 'gey-not-heating',
            title: 'Water Heater Not Heating Check-up',
            rating: '4.88',
            reviews: '650K reviews',
            price: 199,
            originalPrice: 299,
            duration: '35 mins',
            image: '/services/geyser-repair.jpg',
            bullets: [
              'Thermostat calibration, thermal cutout reset and power supply testing',
              'Identifies whether element or thermostat tripped due to overheating'
            ]
          },
          {
            id: 'gey-element-change',
            title: 'Heating Element / Coil Replacement',
            rating: '4.90',
            reviews: '410K reviews',
            price: 349,
            originalPrice: 499,
            duration: '45 mins',
            image: '/services/geyser-repair.jpg',
            bullets: [
              'Heavy copper / glass-lined element replacement with magnesium anode check',
              'Restores rapid water heating with factory warranty parts'
            ]
          },
          {
            id: 'gey-leakage-fix',
            title: 'Geyser Water Leakage Repair',
            rating: '4.85',
            reviews: '280K reviews',
            price: 249,
            originalPrice: 349,
            duration: '35 mins',
            image: '/services/geyser-repair.jpg',
            bullets: [
              'Gasket replacement, inlet safety non-return valve NRV fix',
              'Stops dripping from cold inlet and pressure relief drain'
            ]
          }
        ]
      },
      {
        id: 'gey-install',
        title: 'Installation & Tank Descaling',
        items: [
          {
            id: 'gey-install-new',
            title: 'Geyser Installation (up to 25L)',
            rating: '4.89',
            reviews: '530K reviews',
            price: 399,
            originalPrice: 599,
            duration: '50 mins',
            image: '/services/geyser-repair.jpg',
            bullets: [
              'Solid wall anchor bolting, inlet-outlet connection & earthing verification',
              'Pressure testing under live municipal / overhead tank pressure'
            ]
          },
          {
            id: 'gey-tank-descale',
            title: 'Geyser Deep Tank Descaling & Cleaning',
            rating: '4.87',
            reviews: '320K reviews',
            price: 449,
            originalPrice: 599,
            duration: '60 mins',
            image: '/services/geyser-repair.jpg',
            bullets: [
              'Removes hard water salt buildup, improves heating speed and cuts electricity bill',
              'Extends life of inner tank and prevents corrosion punctures'
            ]
          }
        ]
      }
    ]
  },

  'room-heater': {
    title: 'Room Heater Repair',
    etaMinutes: 40,
    rating: '4.82',
    bookings: '1.2 M bookings',
    hero: {
      tag: 'Winter Warmth',
      title: 'Halogen, Fan Blower & OFR Heater Repair',
      startingPrice: '199',
      image: 'https://res.cloudinary.com/shubhamcloudinary/image/upload/v1766829576/appzeto/heater-1766829573375.jpg'
    },
    coupon: {
      title: '₹75 OFF on Room Heater Repair',
      subtitle: 'Fast doorstep servicing',
      code: 'HEATER75'
    },
    subCategories: [
      { id: 'heat-rep', title: 'Heater Repair', icon: '/services/winter/room-heater.svg' },
      { id: 'heat-maint', title: 'Servicing & Safety', icon: '/services/winter/room-heater.svg' }
    ],
    sections: [
      {
        id: 'heat-rep',
        title: 'Room Heater Repair',
        items: [
          {
            id: 'heat-rod-replace',
            title: 'Halogen / Quartz Heating Rod Replacement',
            rating: '4.83',
            reviews: '290K reviews',
            price: 199,
            originalPrice: 299,
            duration: '30 mins',
            image: 'https://res.cloudinary.com/shubhamcloudinary/image/upload/v1766829576/appzeto/heater-1766829573375.jpg',
            bullets: [
              'Burned quartz tube replacement and safety grill locking',
              'Tests carbon filament continuity for instant glowing warmth'
            ]
          },
          {
            id: 'heat-blower-fix',
            title: 'Fan Blower Room Heater Repair',
            rating: '4.85',
            reviews: '380K reviews',
            price: 249,
            originalPrice: 349,
            duration: '35 mins',
            image: 'https://res.cloudinary.com/shubhamcloudinary/image/upload/v1766829576/appzeto/heater-1766829573375.jpg',
            bullets: [
              'Blower motor servicing, thermostat overheat sensor fix and power switch replacement',
              'Restores hot air blast without burning smell'
            ]
          }
        ]
      },
      {
        id: 'heat-maint',
        title: 'OFR & Maintenance',
        items: [
          {
            id: 'heat-ofr-service',
            title: 'Oil Filled Radiator (OFR) Check & Service',
            rating: '4.89',
            reviews: '160K reviews',
            price: 349,
            originalPrice: 499,
            duration: '45 mins',
            image: 'https://res.cloudinary.com/shubhamcloudinary/image/upload/v1766829576/appzeto/heater-1766829573375.jpg',
            bullets: [
              'Fin heat distribution check, thermostat calibration and tilt-switch safety inspection',
              'Ensures oxygen-friendly ambient room heating without dry air'
            ]
          }
        ]
      }
    ]
  },

  'bathroom-cleaning': {
    title: 'Bathroom Cleaning',
    etaMinutes: 45,
    rating: '4.85',
    bookings: '4.6 M bookings',
    hero: {
      tag: 'Sparkling Hygiene',
      title: 'Intense Stain Removal & Sanitization',
      startingPrice: '449',
      image: '/cleaning-essentials/intense-bathroom.jpg'
    },
    coupon: {
      title: 'Flat ₹100 off on Bathroom Cleaning',
      subtitle: 'Eco-friendly scrub & shine',
      code: 'BATH100'
    },
    subCategories: [
      { id: 'bath-intense', title: 'Bathroom Cleaning', icon: '/categories/bathroom-sink.svg' },
      { id: 'bath-stains', title: 'Tile & Pot Descaling', icon: '/categories/bathroom-sink.svg' }
    ],
    sections: [
      {
        id: 'bath-intense',
        title: 'Bathroom Cleaning Services',
        items: [
          {
            id: 'bath-single',
            title: 'Intense Bathroom Cleaning (1 Bathroom)',
            rating: '4.86',
            reviews: '1.8M reviews',
            price: 449,
            originalPrice: 599,
            duration: '60 mins',
            image: '/cleaning-essentials/intense-bathroom.jpg',
            bullets: [
              'Deep scrubbing of wall & floor tiles, mirror polish, taps and washbasin',
              'Removes hard water stains, soap scum, and yellow lime deposits'
            ]
          },
          {
            id: 'bath-double',
            title: 'Intense Cleaning (2 Bathrooms Special)',
            rating: '4.88',
            reviews: '2.1M reviews',
            price: 799,
            originalPrice: 999,
            duration: '110 mins',
            image: '/cleaning-essentials/intense-two-bathroom.jpg',
            bullets: [
              'Complete deep descaling for two bathrooms at a discounted combo rate',
              'Exhaust fan degreasing, grout scrubbing and high-grade disinfection'
            ]
          }
        ]
      },
      {
        id: 'bath-stains',
        title: 'Tile & Toilet Pot Descaling',
        items: [
          {
            id: 'bath-pot-descale',
            title: 'Western / Indian Toilet Pot Hard Water Descaling',
            rating: '4.84',
            reviews: '640K reviews',
            price: 249,
            originalPrice: 349,
            duration: '35 mins',
            image: '/cleaning-essentials/intense-bathroom.jpg',
            bullets: [
              'Removes tough yellow salt rings and stubborn calcification using specialized agents',
              'Hospital-grade toilet sanitization for germ-free peace of mind'
            ]
          }
        ]
      }
    ]
  },

  'sofa-cleaning': {
    title: 'Sofa Cleaning',
    etaMinutes: 50,
    rating: '4.87',
    bookings: '3.4 M bookings',
    hero: {
      tag: 'Fabric & Leather Care',
      title: 'Sofa Shampooing, Stain Extraction & Odor Removal',
      startingPrice: '499',
      image: '/cleaning-essentials/sofa-cleaning.jpg'
    },
    coupon: {
      title: '₹150 OFF on Sofa Shampooing',
      subtitle: 'High suction extraction',
      code: 'SOFA150'
    },
    subCategories: [
      { id: 'sofa-fabric', title: 'Fabric Sofa Shampoo', icon: '/categories/sofa-cleaning.svg' },
      { id: 'sofa-leather', title: 'Leather & Cushions', icon: '/categories/sofa-cleaning.svg' }
    ],
    sections: [
      {
        id: 'sofa-fabric',
        title: 'Fabric Sofa Shampooing',
        items: [
          {
            id: 'sofa-3seat',
            title: '3-Seater Sofa Deep Shampooing',
            rating: '4.88',
            reviews: '1.2M reviews',
            price: 499,
            originalPrice: 699,
            duration: '60 mins',
            image: '/cleaning-essentials/sofa-cleaning.jpg',
            bullets: [
              'Dry vacuuming, enzymatic foam shampoo & moisture extraction machine',
              'Removes food spills, dirt, pet hair and allergens from upholstery'
            ]
          },
          {
            id: 'sofa-5seat',
            title: '5-Seater Sofa (3+1+1 or 3+2) Shampooing',
            rating: '4.89',
            reviews: '1.6M reviews',
            price: 799,
            originalPrice: 1099,
            duration: '90 mins',
            image: '/cleaning-essentials/sofa-cleaning.jpg',
            bullets: [
              'Deep stain treatment, fabric revitalization and fast-dry vacuuming',
              'Restores vibrant fabric color with fresh floral fragrance'
            ]
          }
        ]
      },
      {
        id: 'sofa-leather',
        title: 'Leather Sofa & Cushions',
        items: [
          {
            id: 'sofa-leather-care',
            title: 'Leather Sofa Conditioning & Polish (Up to 5 seats)',
            rating: '4.86',
            reviews: '420K reviews',
            price: 699,
            originalPrice: 899,
            duration: '60 mins',
            image: '/cleaning-essentials/sofa-cleaning.jpg',
            bullets: [
              'Leather cream nourishment, crack prevention and glossy finish',
              'Gentle grime wiping without damaging original leather hide'
            ]
          },
          {
            id: 'sofa-cushions',
            title: 'Cushion Deep Clean & Sanitization (Set of 5)',
            rating: '4.83',
            reviews: '230K reviews',
            price: 249,
            originalPrice: 349,
            duration: '30 mins',
            image: '/cleaning-essentials/sofa-cleaning.jpg',
            bullets: [
              'Dust mite extraction, sanitizing spray and odor neutralizing treatment',
              'Gentle fabric preservation for embroidered and velvet cushions'
            ]
          }
        ]
      }
    ]
  },

  'kitchen-cleaning': {
    title: 'Kitchen Deep Cleaning',
    etaMinutes: 60,
    rating: '4.84',
    bookings: '2.9 M bookings',
    hero: {
      tag: 'Grease Free Kitchen',
      title: 'Chimney, Stove, Tiles & Cabinet Degreasing',
      startingPrice: '699',
      image: '/cleaning-essentials/kitchen-cleaning.jpg'
    },
    coupon: {
      title: 'Flat ₹150 off on Kitchen Cleaning',
      subtitle: 'Food-safe degreasers',
      code: 'KITCHEN150'
    },
    subCategories: [
      { id: 'kitch-deep', title: 'Full Kitchen Clean', icon: '/cleaning-essentials/kitchen-cleaning.svg' },
      { id: 'kitch-appliance', title: 'Chimney & Degreasing', icon: '/cleaning-essentials/kitchen-cleaning.svg' }
    ],
    sections: [
      {
        id: 'kitch-deep',
        title: 'Kitchen Deep Cleaning',
        items: [
          {
            id: 'kitch-full',
            title: 'Complete Kitchen Deep Cleaning',
            rating: '4.85',
            reviews: '1.4M reviews',
            price: 899,
            originalPrice: 1199,
            duration: '120 mins',
            image: '/cleaning-essentials/kitchen-cleaning.jpg',
            bullets: [
              'Oil & grease removal from backsplash tiles, countertops, sink, and exterior cabinets',
              'Gas stove burner cleaning and floor scrubbing with anti-bacterial formulation'
            ]
          },
          {
            id: 'kitch-empty',
            title: 'Empty Kitchen Deep Cleaning (Move-in / Move-out)',
            rating: '4.87',
            reviews: '820K reviews',
            price: 699,
            originalPrice: 949,
            duration: '90 mins',
            image: '/cleaning-essentials/kitchen-cleaning.jpg',
            bullets: [
              'Inside-out scrubbing of empty cabinets, exhaust fan, floor and drainage',
              'Spotless sanitation ready for your spices and cookware'
            ]
          }
        ]
      },
      {
        id: 'kitch-appliance',
        title: 'Chimney & Stove Degreasing',
        items: [
          {
            id: 'kitch-chimney-degrease',
            title: 'Kitchen Chimney & Baffle Filter Degreasing',
            rating: '4.88',
            reviews: '640K reviews',
            price: 399,
            originalPrice: 549,
            duration: '45 mins',
            image: '/cleaning-essentials/kitchen-cleaning.jpg',
            bullets: [
              'High-power degreasing chemical wash for sticky baffle/mesh filters and hood',
              'Restores maximum chimney suction efficiency without kitchen smoke'
            ]
          }
        ]
      }
    ]
  },

  'threading': {
    title: 'Facial Threading',
    etaMinutes: 20,
    rating: '4.89',
    bookings: '3.1 M bookings',
    hero: {
      tag: 'Precision Shaping',
      title: 'Eyebrow, Upper Lip & Full Face Threading',
      startingPrice: '39',
      image: '/services/threading.jpg'
    },
    coupon: {
      title: '₹30 OFF on Threading Add-on',
      subtitle: 'Skin-friendly organic thread',
      code: 'THREAD30'
    },
    subCategories: [
      { id: 'th-eyebrow', title: 'Eyebrow & Lip', icon: '/services/threading.jpg' },
      { id: 'th-face', title: 'Full Face Threading', icon: '/services/threading.jpg' }
    ],
    sections: [
      {
        id: 'th-eyebrow',
        title: 'Eyebrows, Upper Lip & Chin',
        items: [
          {
            id: 'th-eyebrow-shape',
            title: 'Eyebrow Threading & Shaping',
            rating: '4.89',
            reviews: '2.1M reviews',
            price: 49,
            originalPrice: 69,
            duration: '15 mins',
            image: '/services/threading.jpg',
            bullets: [
              'Clean arch shaping, trimming & soothing aloe vera gel finish',
              'Painless technique using anti-bacterial cotton thread'
            ]
          },
          {
            id: 'th-upper-lip',
            title: 'Upper Lip Threading',
            rating: '4.86',
            reviews: '1.2M reviews',
            price: 39,
            originalPrice: 49,
            duration: '10 mins',
            image: '/services/threading.jpg',
            bullets: [
              'Quick, gentle fine hair removal from upper lip zone',
              'Instant smooth skin for flawless lipstick application'
            ]
          },
          {
            id: 'th-chin-forehead',
            title: 'Chin & Forehead Threading',
            rating: '4.84',
            reviews: '640K reviews',
            price: 59,
            originalPrice: 79,
            duration: '15 mins',
            image: '/services/threading.jpg',
            bullets: [
              'Removes fine baby hair cleanly with organic thread',
              'Reduces peach fuzz without redness'
            ]
          }
        ]
      },
      {
        id: 'th-face',
        title: 'Full Face Threading',
        items: [
          {
            id: 'th-full-face',
            title: 'Full Face Threading (Includes Eyebrows)',
            rating: '4.91',
            reviews: '890K reviews',
            price: 149,
            originalPrice: 199,
            duration: '30 mins',
            image: '/services/threading.jpg',
            bullets: [
              'Complete facial hair removal: eyebrows, upper lip, chin, sideburns & forehead',
              'Leaves face silky smooth and makeup ready with cooling rosewater wipe'
            ]
          }
        ]
      }
    ]
  },

  'waxing': {
    title: 'Waxing Services',
    etaMinutes: 35,
    rating: '4.88',
    bookings: '2.7 M bookings',
    hero: {
      tag: 'Smooth Skin',
      title: 'Spatula Waxing, Rica & Honey Body Waxing',
      startingPrice: '149',
      image: '/services/spatula-waxing.jpg'
    },
    coupon: {
      title: 'Flat ₹100 off on Waxing Combos',
      subtitle: 'Painless technique with spatula',
      code: 'WAX100'
    },
    subCategories: [
      { id: 'wax-combos', title: 'Full Body Combos', icon: '/services/spatula-waxing.jpg' },
      { id: 'wax-arms-legs', title: 'Arms & Legs', icon: '/services/spatula-waxing.jpg' }
    ],
    sections: [
      {
        id: 'wax-combos',
        title: 'Spatula Waxing Combos',
        items: [
          {
            id: 'wax-full-combo',
            title: 'Spatula Waxing (Full Arms, Legs & Underarms)',
            rating: '4.89',
            reviews: '1.4M reviews',
            price: 599,
            originalPrice: 799,
            duration: '50 mins',
            image: '/services/spatula-waxing.jpg',
            bullets: [
              'Disposable spatula application, 100% hygienic single-use wax strips & after-wax oil',
              'Painless gentle pull suitable for sensitive skin with zero double-dipping'
            ]
          },
          {
            id: 'wax-full-body',
            title: 'Full Body Waxing (Arms, Legs, Underarms & Back)',
            rating: '4.92',
            reviews: '860K reviews',
            price: 1199,
            originalPrice: 1599,
            duration: '80 mins',
            image: '/services/spatula-waxing.jpg',
            bullets: [
              'Comprehensive gentle body wax with post-wax skin soothing lotion',
              'Removes tan and leaves skin glowy soft for 4+ weeks'
            ]
          }
        ]
      },
      {
        id: 'wax-arms-legs',
        title: 'Arms, Legs & Underarms',
        items: [
          {
            id: 'wax-full-arms',
            title: 'Full Arms + Underarms Waxing',
            rating: '4.87',
            reviews: '720K reviews',
            price: 299,
            originalPrice: 399,
            duration: '30 mins',
            image: '/services/spatula-waxing.jpg',
            bullets: [
              'Thorough tan and hair removal from fingers to shoulders',
              'Includes underarms waxing with soothing after-wax spray'
            ]
          },
          {
            id: 'wax-full-legs',
            title: 'Full Legs Waxing',
            rating: '4.88',
            reviews: '680K reviews',
            price: 349,
            originalPrice: 449,
            duration: '35 mins',
            image: '/services/spatula-waxing.jpg',
            bullets: [
              'Smooth hair extraction from feet to thighs with gentle wax',
              'No sticky residue, leaves legs radiant and sleek'
            ]
          },
          {
            id: 'wax-underarms',
            title: 'Underarms Waxing',
            rating: '4.85',
            reviews: '950K reviews',
            price: 99,
            originalPrice: 149,
            duration: '15 mins',
            image: '/services/spatula-waxing.jpg',
            bullets: [
              'Quick & painless underarm hair removal',
              'Brightens skin and prevents ingrown hair'
            ]
          }
        ]
      }
    ]
  },

  'refrigerator': {
    title: 'Refrigerator Repair',
    etaMinutes: 40,
    rating: '4.83',
    bookings: '1.8 M bookings',
    hero: {
      tag: 'Cooling Specialists',
      title: 'Single Door, Double Door & Frost Free Refrigerator',
      startingPrice: '199',
      image: '/appliance/refrigerator-repair.jpg'
    },
    coupon: {
      title: '₹100 OFF on Fridge Repair',
      subtitle: 'Genuine spare parts with warranty',
      code: 'FRIDGE100'
    },
    subCategories: [
      { id: 'fridge-checkup', title: 'Repair & Diagnostics', icon: '/ServiceIcon/refrigerator.svg' },
      { id: 'fridge-cooling', title: 'Cooling & Gas', icon: '/ServiceIcon/refrigerator.svg' }
    ],
    sections: [
      {
        id: 'fridge-checkup',
        title: 'Refrigerator Check-up & Repair',
        items: [
          {
            id: 'fridge-check',
            title: 'Refrigerator Check-up & Diagnosis',
            rating: '4.83',
            reviews: '410K reviews',
            price: 199,
            originalPrice: 299,
            duration: '35 mins',
            image: '/appliance/refrigerator-repair.jpg',
            bullets: [
              'Relay, overload protector, PCB and thermostat diagnostics',
              'Comprehensive multi-point inspection for cooling and noise'
            ]
          },
          {
            id: 'fridge-not-cooling',
            title: 'Fridge Not Cooling / Less Cooling Repair',
            rating: '4.86',
            reviews: '530K reviews',
            price: 299,
            originalPrice: 399,
            duration: '40 mins',
            image: '/appliance/refrigerator-repair.jpg',
            bullets: [
              'Defrost timer, bimetal sensor and evaporator fan motor repair',
              'Solves excessive ice accumulation or zero cooling in lower fridge compartment'
            ]
          }
        ]
      },
      {
        id: 'fridge-cooling',
        title: 'Gas Charging & Compressor',
        items: [
          {
            id: 'fridge-gas-refill',
            title: 'Refrigerator Gas Leak Test & Charging',
            rating: '4.88',
            reviews: '310K reviews',
            price: 1299,
            originalPrice: 1699,
            duration: '60 mins',
            image: '/appliance/refrigerator-repair.jpg',
            bullets: [
              'Nitrogen pressure leak detection, copper brazing and pure R134a/R600a gas refill',
              'Restores rapid deep freezing in freezer cabin'
            ]
          }
        ]
      }
    ]
  },
};

// =========================================================================
// Category Matcher Helper
// =========================================================================
const resolveCategoryKey = (categoryOrService) => {
  if (!categoryOrService) return 'womens-salon';
  const slug = (categoryOrService.slug || '').toLowerCase().trim();
  const title = (categoryOrService.title || categoryOrService.name || '').toLowerCase().trim();
  const text = `${slug} ${title} ${categoryOrService.id || ''}`.replace(/[^a-z0-9]+/g, ' ');

  // 1. SPECIFIC SUB-SERVICE MATCHES FIRST (When clicked from home cards or direct search)
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

  return 'electrician-services';
};

const EMPTY_CATALOG = { sections: [], subCategories: [] };

// Contextual fallback image resolver matching the exact category & service topic
const resolveServiceImage = (item, category, categoryTitle) => {
  const isGenericSvg = (url) => url && (url.includes('electrician.svg') || url.includes('womens-salon.jpg') || url.includes('womens-salon.png'));
  if (item?.image && !isGenericSvg(item.image)) return toAssetUrl(item.image);
  if (Array.isArray(item?.images) && item.images.length > 0 && item.images[0] && !isGenericSvg(item.images[0])) {
    return toAssetUrl(item.images[0]);
  }
  if (item?.iconUrl && !isGenericSvg(item.iconUrl)) return toAssetUrl(item.iconUrl);
  if (item?.icon && !isGenericSvg(item.icon)) return toAssetUrl(item.icon);

  const itemTitle = `${item?.title || ''} ${item?.name || ''}`.toLowerCase();
  const catTitle = `${category?.title || ''} ${categoryTitle || ''} ${category?.slug || ''}`.toLowerCase();
  const combined = `${itemTitle} ${catTitle}`.toLowerCase();

  // 1. Exact Item-Based Image Resolution (Matches each service with its exact photo)
  if (itemTitle.includes('tap') || itemTitle.includes('faucet')) {
    return '/services/tap-repair.jpg';
  }
  if (itemTitle.includes('plumb') || itemTitle.includes('pipe') || itemTitle.includes('drain') || itemTitle.includes('flush') || itemTitle.includes('toilet') || itemTitle.includes('leak') || itemTitle.includes('basin') || itemTitle.includes('sink') || itemTitle.includes('jet spray') || itemTitle.includes('shower') || itemTitle.includes('water tank') || itemTitle.includes('motor') || itemTitle.includes('valve')) {
    return '/categories/plumber-toilet.svg';
  }
  if (itemTitle.includes('fan')) {
    return '/services/fan-repair.jpg';
  }
  if (itemTitle.includes('geyser') || itemTitle.includes('water heater')) {
    return '/services/geyser-repair.jpg';
  }
  if (itemTitle.includes('room heater') || itemTitle.includes('heater') || itemTitle.includes('blower') || itemTitle.includes('radiator') || itemTitle.includes('ofr')) {
    return 'https://res.cloudinary.com/shubhamcloudinary/image/upload/v1766829576/appzeto/heater-1766829573375.jpg';
  }
  if (itemTitle.includes('inverter') || itemTitle.includes('invertor')) {
    return '/services/electrical/inverter.jpg';
  }
  if (itemTitle.includes('mcb') || itemTitle.includes('sub meter') || itemTitle.includes('changeover')) {
    return '/services/electrical/mcb.jpg';
  }
  if (itemTitle.includes('wiring') || itemTitle.includes('short circuit') || itemTitle.includes('earthing')) {
    return '/services/electrical/home-wiring.jpg';
  }
  if (itemTitle.includes('switch') || itemTitle.includes('socket')) {
    return '/services/switch-socket.jpg';
  }
  if (itemTitle.includes('bathroom') || itemTitle.includes('toilet') || itemTitle.includes('washbasin')) {
    return '/cleaning-essentials/intense-bathroom.jpg';
  }
  if (itemTitle.includes('sofa') || itemTitle.includes('couch') || itemTitle.includes('cushion')) {
    return '/cleaning-essentials/sofa-cleaning.jpg';
  }
  if (itemTitle.includes('kitchen') || itemTitle.includes('chimney') || itemTitle.includes('stove')) {
    return '/cleaning-essentials/kitchen-cleaning.jpg';
  }
  if (itemTitle.includes('threading') || itemTitle.includes('eyebrow')) {
    return '/services/threading.jpg';
  }
  if (itemTitle.includes('wax') || itemTitle.includes('spatula')) {
    return '/services/spatula-waxing.jpg';
  }
  if (itemTitle.includes('refrigerator') || itemTitle.includes('fridge')) {
    return '/appliance/refrigerator-repair.jpg';
  }
  if (itemTitle.includes('washing machine')) {
    return '/appliance/washing-machine-checkup.jpg';
  }
  if (itemTitle.includes('purifier') || itemTitle.includes('ro')) {
    return '/appliance/water-purifier-service.jpg';
  }
  if (itemTitle.includes('ac') || itemTitle.includes('air condition') || itemTitle.includes('cooler')) {
    return '/appliance/ac-repair.jpg';
  }
  if (itemTitle.includes('carpent') || itemTitle.includes('door') || itemTitle.includes('lock') || itemTitle.includes('handle') || itemTitle.includes('hinge') || itemTitle.includes('drill') || itemTitle.includes('mesh') || itemTitle.includes('window') || itemTitle.includes('wardrobe') || itemTitle.includes('drawer') || itemTitle.includes('curtain')) {
    return '/categories/carpenter-door.svg';
  }
  if (itemTitle.includes('furniture') || itemTitle.includes('assembly') || itemTitle.includes('bed') || itemTitle.includes('table') || itemTitle.includes('chair') || itemTitle.includes('desk') || itemTitle.includes('shelf')) {
    return '/categories/furniture-assembly.svg';
  }

  // 2. Men's Salon & Grooming
  const isMen =
    combined.includes('men') ||
    combined.includes('male') ||
    combined.includes('boy') ||
    combined.includes('barber') ||
    combined.includes('groom') ||
    combined.includes('beard') ||
    combined.includes('shave');

  if (isMen) {
    if (combined.includes('massage')) return '/categories/massage-men.svg';
    return '/categories/mens-salon.png';
  }

  // 3. Women's Salon & Spa
  if (combined.includes('facial') || combined.includes('cleanup')) return '/services/signature-facial.jpg';
  if (combined.includes('glow') || combined.includes('korean') || combined.includes('japanese') || combined.includes('ritual')) return '/services/hair-studio-facial.jpg';
  if (combined.includes('pedi') || combined.includes('mani') || combined.includes('nail')) return '/categories/spa-women.svg';
  if (combined.includes('spa') || combined.includes('salon') || combined.includes('women')) return '/categories/womens-salon.jpg';

  // 4. Fallbacks by Category Title
  if (catTitle.includes('fan')) return '/services/fan-repair.jpg';
  if (catTitle.includes('wiring')) return '/services/electrical/home-wiring.jpg';
  if (catTitle.includes('inverter')) return '/services/electrical/inverter.jpg';
  if (catTitle.includes('mcb')) return '/services/electrical/mcb.jpg';
  if (catTitle.includes('switch') || catTitle.includes('socket')) return '/services/switch-socket.jpg';
  if (catTitle.includes('tap')) return '/services/tap-repair.jpg';
  if (catTitle.includes('geyser') || catTitle.includes('water heater')) return '/services/geyser-repair.jpg';
  if (catTitle.includes('room heater') || catTitle.includes('heater')) return 'https://res.cloudinary.com/shubhamcloudinary/image/upload/v1766829576/appzeto/heater-1766829573375.jpg';
  if (catTitle.includes('bath')) return '/cleaning-essentials/intense-bathroom.jpg';
  if (catTitle.includes('sofa')) return '/cleaning-essentials/sofa-cleaning.jpg';
  if (catTitle.includes('kitchen')) return '/cleaning-essentials/kitchen-cleaning.jpg';
  if (catTitle.includes('threading')) return '/services/threading.jpg';
  if (catTitle.includes('wax')) return '/services/spatula-waxing.jpg';
  if (catTitle.includes('fridge') || catTitle.includes('refrigerator')) return '/appliance/refrigerator-repair.jpg';
  if (catTitle.includes('plumb')) return '/categories/plumber-toilet.svg';
  if (catTitle.includes('carpent')) return '/categories/carpenter-door.svg';
  if (catTitle.includes('furniture')) return '/categories/furniture-assembly.svg';
  if (catTitle.includes('electric')) return '/categories/electrician-switch.svg';

  // 5. If category has its own uploaded image, use as fallback
  if (category?.imageUrl && !isGenericSvg(category.imageUrl)) return toAssetUrl(category.imageUrl);
  if (category?.image && !isGenericSvg(category.image)) return toAssetUrl(category.image);
  if (category?.iconUrl && !isGenericSvg(category.iconUrl)) return toAssetUrl(category.iconUrl);
  if (category?.icon && !isGenericSvg(category.icon)) return toAssetUrl(category.icon);

  return '/categories/electrician-switch.svg';
};

// =========================================================================
// ServiceCatalogModal Component
// =========================================================================
const ServiceCatalogModal = React.memo(({
  isOpen,
  onClose,
  category,
  currentCity,
  location: userAddress,
  zoneId
}) => {
  const navigate = useNavigate();
  const { cartItems, addToCart, updateItem, removeItem } = useCart();

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
  const hardcodedConfig = catalogKey && CATALOG_DATA[catalogKey];

  const catalogConfig = useMemo(() => {
    if (hardcodedConfig) return hardcodedConfig;
    if (!catalogData) return EMPTY_CATALOG;
    const cat = catalogData.category || {};
    return {
      title: cat.title,
      etaMinutes: cat.etaDefaultMinutes,
      rating: cat.displayRating,
      bookings: cat.bookingsLabel,
      hero: catalogData.hero && catalogData.hero.title ? catalogData.hero : null,
      coupon: catalogData.bestCoupon || null,
      subCategories: (catalogData.subCategories || []).map(sc => ({
        id: sc._id || sc.slug,
        title: sc.title,
        icon: sc.icon || sc.homeIconUrl
      })),
      sections: []
    };
  }, [hardcodedConfig, catalogData]);

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
        rating: s.rating ? String(s.rating) : '4.8',
        reviews: s.reviewsCount ? `${s.reviewsCount} reviews` : (s.reviews || '1k+ reviews'),
        duration: durationStr,
        image: s.images?.[0] ? toAssetUrl(s.images[0]) : (s.iconUrl ? toAssetUrl(s.iconUrl) : (s.icon ? toAssetUrl(s.icon) : null)),
        images: serviceImages,
        isPackage: Boolean(s.isPackage),
        variants: s.variants || [],
        inclusions: Array.isArray(s.inclusions) ? s.inclusions : [],
        exclusions: Array.isArray(s.exclusions) ? s.exclusions : [],
        faqs: Array.isArray(s.faqs) ? s.faqs : [],
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
    if (catalogKey === 'refrigerator') return '/ServiceIcon/refrigerator.svg';
    if (catalogKey === 'washing-machine') return '/ServiceIcon/washing-machine.svg';
    if (catalogKey === 'water-purifier') return '/ServiceIcon/ro-purifier.svg';
    if (catalogKey === 'electrician-services') return '/categories/electrician-switch.svg';
    if (catalogKey === 'plumber') return '/categories/plumber-toilet.svg';
    if (catalogKey === 'carpenter') return '/categories/carpenter-door.svg';
    if (catalogKey === 'furniture-assembly') return '/categories/furniture-assembly.svg';
    if (catalogKey === 'ac-repair') return '/categories/ac-appliance.svg';
    if (catalogKey === 'cleaning') return '/categories/cleaning.svg';
    if (catalogKey === 'mens-salon') return '/categories/mens-salon.png';
    if (catalogKey === 'womens-salon') return '/categories/womens-salon.png';
    return '/categories/electrician-switch.svg';
  }, [catalogKey]);

  // Combined SubCategories (pills at top)
  const combinedSubCategories = useMemo(() => {
    const livePills = liveSections.map((sec) => {
      const secTitleLower = (sec.title || '').toLowerCase();
      let icon = sec.icon;
      if (!icon || icon.includes('electrician.svg') || icon.includes('womens-salon')) {
        if (secTitleLower.includes('plumb') || secTitleLower.includes('tap') || secTitleLower.includes('pipe') || secTitleLower.includes('drain')) {
          icon = '/categories/plumber-toilet.svg';
        } else if (secTitleLower.includes('carpent') || secTitleLower.includes('door') || secTitleLower.includes('lock')) {
          icon = '/categories/carpenter-door.svg';
        } else if (secTitleLower.includes('furniture') || secTitleLower.includes('assembly')) {
          icon = '/categories/furniture-assembly.svg';
        } else if (secTitleLower.includes('switch') || secTitleLower.includes('socket') || secTitleLower.includes('electric') || secTitleLower.includes('wiring')) {
          icon = '/categories/electrician-switch.svg';
        } else if (secTitleLower.includes('fan')) {
          icon = '/services/fan-repair.jpg';
        } else if (secTitleLower.includes('bathroom') || secTitleLower.includes('sink')) {
          icon = '/categories/bathroom-sink.svg';
        } else if (secTitleLower.includes('sofa') || secTitleLower.includes('carpet')) {
          icon = '/categories/sofa-cleaning.svg';
        } else {
          icon = getCategoryIllustration(sec.title) || resolveServiceImage(sec.items[0], category, sec.title);
        }
      }
      return {
        id: sec.id,
        title: sec.title,
        icon,
        isNew: true
      };
    });

    const seenTitles = new Set(livePills.map(p => (p.title || '').toLowerCase().trim()));
    const catalogPills = (catalogConfig.subCategories || [])
      .filter(sc => !seenTitles.has((sc.title || '').toLowerCase().trim()))
      .map(sc => {
        let icon = sc.icon;
        const scTitleLower = (sc.title || '').toLowerCase();
        if (!icon || icon.includes('electrician.svg') || icon.includes('womens-salon')) {
          if (scTitleLower.includes('plumb') || scTitleLower.includes('tap') || scTitleLower.includes('pipe') || scTitleLower.includes('drain')) {
            icon = '/categories/plumber-toilet.svg';
          } else if (scTitleLower.includes('carpent') || scTitleLower.includes('door') || scTitleLower.includes('lock')) {
            icon = '/categories/carpenter-door.svg';
          } else if (scTitleLower.includes('furniture') || scTitleLower.includes('assembly')) {
            icon = '/categories/furniture-assembly.svg';
          } else if (scTitleLower.includes('switch') || scTitleLower.includes('socket') || scTitleLower.includes('electric') || scTitleLower.includes('wiring')) {
            icon = '/categories/electrician-switch.svg';
          } else if (scTitleLower.includes('fan')) {
            icon = '/services/fan-repair.jpg';
          } else {
            icon = getCategoryIllustration(sc.title) || sc.icon;
          }
        }
        return { ...sc, icon };
      });

    return [...livePills, ...catalogPills];
  }, [liveSections, catalogConfig.subCategories, category, categoryTitle]);

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

  // Combine curated sections with live backend services (LIVE AT TOP, deduplicated by section title)
  const combinedSections = useMemo(() => {
    const seenSectionTitles = new Set();
    const uniqueLiveSections = liveSections.filter(sec => {
      const key = (sec.title || '').toLowerCase().trim();
      if (seenSectionTitles.has(key)) return false;
      seenSectionTitles.add(key);
      return true;
    });

    const uniqueCatalogSections = (catalogConfig.sections || []).filter(sec => {
      const key = (sec.title || '').toLowerCase().trim();
      return !seenSectionTitles.has(key);
    });

    let sections = [...uniqueLiveSections, ...uniqueCatalogSections];

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
  }, [liveSections, catalogConfig.sections, searchQuery]);

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

  // Handle Add to Cart
  const handleAddToCart = async (item, e) => {
    e?.stopPropagation?.();
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
        rating: item.rating || '4.9',
        reviews: item.reviews || '1k+',
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
  const handleVariantAddToCart = async (parentItem, variant, e) => {
    e?.stopPropagation?.();
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
        rating: parentItem.rating || '4.9',
        reviews: parentItem.reviews || '1k+',
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
              totalCartCount > 0 ? 'pb-32' : 'pb-16'
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
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-[22px] sm:text-[24px] font-bold text-gray-900 tracking-tight leading-tight">
                    {categoryTitle}
                  </h1>
                  <div className="flex items-center gap-1.5 mt-1 text-[13px] text-gray-600">
                    <span className="flex items-center gap-1 font-semibold text-gray-900">
                      <FiStar className="w-3.5 h-3.5 fill-[#EAB308] text-[#EAB308] stroke-none" />
                      {catalogConfig.rating || '4.89'}
                    </span>
                    <span className="underline decoration-dotted text-gray-500 font-normal">
                      ({catalogConfig.bookings || '2.2 M bookings'})
                    </span>
                  </div>
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

            {/* ========================================================================= */}
            {/* SUB-CATEGORY PILL SELECTOR (Screenshots 1 & 2) */}
            {/* ========================================================================= */}
            {combinedSubCategories?.length > 0 && (
              <div className="mt-2.5 border-y border-gray-100 bg-white py-3">
                <div className="flex items-start gap-3.5 overflow-x-auto px-4 scrollbar-hide overscroll-x-contain">
                  {combinedSubCategories.map((sub) => {
                    const isActive = activeSubTab === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => scrollToSection(sub.id)}
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
              {combinedSections.map((section) => (
                <div
                  key={section.id}
                  ref={(el) => (sectionRefs.current[section.id] = el)}
                  className="space-y-3.5 pt-1"
                >
                  {/* Section Title */}
                  <h3 className="text-[19px] sm:text-[20px] font-bold text-gray-900 tracking-tight">
                    {section.title}
                  </h3>

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
                                <div className="flex items-center gap-1.5 mt-1 text-[12px] text-gray-500">
                                  <span className="flex items-center gap-0.5 font-semibold text-gray-900">
                                    <FiStar className="w-3 h-3 fill-[#EAB308] text-[#EAB308] stroke-none" />
                                    {item.rating || '4.90'}
                                  </span>
                                  <span className="underline decoration-dotted text-gray-500 font-normal">
                                    ({item.reviews || '1.2M reviews'})
                                  </span>
                                </div>

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
                                    const itemFallbackImg = resolveServiceImage(item, category, categoryTitle);
                                    return (
                                      <ImageWithFallback
                                        src={item.image || item.images?.[0] || itemFallbackImg}
                                        alt={item.title}
                                        fallback={itemFallbackImg}
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
              ))}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* FLOATING "☰ MENU" BUTTON (Positioned gracefully) */}
          {/* ========================================================================= */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 z-40 pointer-events-auto transition-all duration-300 ${
              totalCartCount > 0 ? 'bottom-23' : 'bottom-5'
            }`}
          >
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="bg-[#1A1D20] text-white px-4 py-2 rounded-full font-bold text-[13px] flex items-center gap-1.5 shadow-2xl hover:bg-black active:scale-95 transition-all cursor-pointer border border-white/20"
            >
              <FiMenu className="w-4 h-4" />
              <span>Menu</span>
            </button>
          </div>

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
                <div className="px-4 py-3 flex items-center justify-between gap-3 bg-white">
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
                      onClose();
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
                  className="fixed inset-x-0 bottom-0 z-[10020] bg-white rounded-t-3xl p-5 max-w-lg mx-auto shadow-2xl max-h-[70vh] flex flex-col"
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
              const rawDetailImages = Array.isArray(selectedItemDetails.images) && selectedItemDetails.images.length > 0
                ? selectedItemDetails.images
                : (selectedItemDetails.image ? [selectedItemDetails.image] : []);
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
                    className="fixed inset-x-0 bottom-0 z-[10020] bg-white rounded-t-3xl max-w-lg mx-auto shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
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
                          <div className="flex items-center gap-1.5 mt-1 text-[12px] text-gray-500">
                            <span className="flex items-center gap-0.5 font-semibold text-gray-900">
                              <FiStar className="w-3.5 h-3.5 fill-[#EAB308] text-[#EAB308] stroke-none" />
                              {selectedItemDetails.rating || '4.90'}
                            </span>
                            <span className="underline decoration-dotted text-gray-500 font-normal">
                              ({selectedItemDetails.reviews || '1.2M reviews'})
                            </span>
                          </div>
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

                      {/* Cancellation Policy */}
                      {selectedItemDetails.cancellationPolicy && (
                        <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100 text-amber-950">
                          <div className="flex items-center gap-2 font-bold text-[12px] text-amber-900 mb-0.5">
                            <FiClock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            Cancellation Policy
                          </div>
                          <p className="text-[12px] text-amber-900/90 leading-relaxed">
                            {selectedItemDetails.cancellationPolicy}
                          </p>
                        </div>
                      )}

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
                  className="fixed inset-x-0 bottom-0 z-[10020] bg-white rounded-t-3xl max-w-lg mx-auto shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
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
                          onClose();
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

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
});

ServiceCatalogModal.displayName = 'ServiceCatalogModal';

export default ServiceCatalogModal;
