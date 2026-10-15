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
  FiZap
} from 'react-icons/fi';
import { useCart } from '../../../../../context/CartContext';
import { publicCatalogService } from '../../../../../services/catalogService';
import { toast } from 'react-hot-toast';

// Helper to sanitize asset URLs
const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = url.replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

// Image with automatic fallback so broken image icons never appear
const ImageWithFallback = ({ src, alt, className, fallback = '/categories/womens-salon.png' }) => {
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
            bullets: [
              'High density 5-micron PP spun candle removes mud, sand & rust'
            ]
          }
        ]
      }
    ]
  },

  'electrician-services': {
    title: 'Electrician, Plumber & Carpenter',
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
      subtitle: 'Applicable on all handyman bookings',
      code: 'FIX100'
    },
    subCategories: [
      { id: 'electrical', title: 'Switches & sockets', icon: '/services/switch-socket.jpg' },
      { id: 'fans', title: 'Fan install & repair', icon: '/services/fan-repair.jpg' },
      { id: 'plumbing', title: 'Plumbing & taps', icon: '/categories/plumber-toilet.svg' },
      { id: 'carpentry', title: 'Carpentry & assembly', icon: '/categories/furniture-assembly.svg' }
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
            id: 'elec-mcb-replacement',
            title: 'MCB / Fuse Replacement',
            rating: '4.88',
            reviews: '120K reviews',
            price: 199,
            originalPrice: 299,
            duration: '30 mins',
            bullets: [
              'Single or double pole MCB replacement for overload tripping issues'
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
            bullets: [
              'Fixes slow spinning speed, humming noise, or jerky rotation'
            ]
          }
        ]
      },
      {
        id: 'plumbing',
        title: 'Plumbing & taps',
        items: [
          {
            id: 'plumb-tap-repair',
            title: 'Tap / Mixer Repair & Installation',
            rating: '4.86',
            reviews: '410K reviews',
            price: 149,
            originalPrice: 199,
            duration: '30 mins',
            bullets: [
              'Fixes persistent dripping, washer wear, or replaces mixer spindle'
            ]
          },
          {
            id: 'plumb-flush-tank',
            title: 'Toilet Flush Tank Repair',
            rating: '4.81',
            reviews: '95K reviews',
            price: 249,
            originalPrice: 349,
            duration: '40 mins',
            bullets: [
              'Syphon or inlet ballcock valve repair for non-stop tank filling'
            ]
          }
        ]
      },
      {
        id: 'carpentry',
        title: 'Carpentry & assembly',
        items: [
          {
            id: 'carp-door-lock',
            title: 'Door Lock / Handle Repair',
            rating: '4.87',
            reviews: '110K reviews',
            price: 249,
            originalPrice: 349,
            duration: '45 mins',
            bullets: [
              'Mortise / cylindrical lock fitting or sticking latch realignment'
            ]
          },
          {
            id: 'carp-furniture-assembly',
            title: 'Furniture Assembly (Table / Chair / Shelf)',
            rating: '4.89',
            reviews: '75K reviews',
            price: 399,
            originalPrice: 499,
            duration: '1 hr',
            bullets: [
              'Precision IKEA / engineered wood furniture flat-pack assembly'
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
      { id: 'packages', title: 'Super saver packages', badge: 'Upto 30% OFF' },
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
  }
};

// =========================================================================
// Category Matcher Helper
// =========================================================================
const resolveCategoryKey = (categoryOrService) => {
  if (!categoryOrService) return 'womens-salon';
  const text = `${categoryOrService.slug || ''} ${categoryOrService.title || ''} ${categoryOrService.id || ''}`.toLowerCase();

  if (text.includes('salon-luxe') || text.includes('women') || text.includes('salon') || text.includes('wax') || text.includes('facial') || text.includes('spa') || text.includes('hair-studio')) {
    return 'womens-salon';
  }
  if (text.includes('ac') || text.includes('air-conditioner') || text.includes('cooler')) {
    return 'ac-repair';
  }
  if (text.includes('clean') || text.includes('bathroom') || text.includes('kitchen') || text.includes('sofa') || text.includes('pest')) {
    return 'cleaning';
  }
  if (text.includes('wash') || text.includes('laundry')) {
    return 'washing-machine';
  }
  if (text.includes('purifier') || text.includes('water') || text.includes('ro')) {
    return 'water-purifier';
  }
  if (text.includes('electric') || text.includes('plumb') || text.includes('carpent') || text.includes('switch') || text.includes('fan')) {
    return 'electrician-services';
  }
  if (text.includes('men') || text.includes('barber') || text.includes('groom')) {
    return 'mens-salon';
  }

  return 'womens-salon';
};

// =========================================================================
// ServiceCatalogModal Component
// =========================================================================
const ServiceCatalogModal = React.memo(({
  isOpen,
  onClose,
  category,
  currentCity,
  location: userAddress
}) => {
  const navigate = useNavigate();
  const { cartItems, addToCart, updateItem, removeItem } = useCart();

  const [activeSubTab, setActiveSubTab] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedItemDetails, setSelectedItemDetails] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [backendServices, setBackendServices] = useState([]);
  const [addingId, setAddingId] = useState(null);

  const sectionRefs = useRef({});
  const catalogScrollRef = useRef(null);

  // Determine active catalog dataset
  const catalogKey = useMemo(() => resolveCategoryKey(category), [category]);
  const catalogConfig = CATALOG_DATA[catalogKey] || CATALOG_DATA['womens-salon'];

  const categoryTitle = category?.title || catalogConfig.title;

  // Set default active tab
  useEffect(() => {
    if (catalogConfig.subCategories?.[0]) {
      setActiveSubTab(catalogConfig.subCategories[0].id);
    }
  }, [catalogConfig]);

  // Fetch live backend services if category ID exists
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setIsSearchOpen(false);
      setIsMenuOpen(false);
      setSelectedItemDetails(null);
      return;
    }

    const fetchLiveServices = async () => {
      if (category?.id || category?._id) {
        try {
          const res = await publicCatalogService.getServices({
            categoryId: category.id || category._id
          });
          if (res.success && Array.isArray(res.services)) {
            setBackendServices(res.services);
          }
        } catch {
          // Fallback silently to curated catalog
        }
      }
    };

    fetchLiveServices();
  }, [isOpen, category?.id, category?._id]);

  // Combine curated sections with live backend services
  const combinedSections = useMemo(() => {
    let sections = catalogConfig.sections || [];

    // If backend has services, inject live section
    if (backendServices.length > 0) {
      const liveItems = backendServices.map(s => ({
        id: s._id || s.id,
        isBackendService: true,
        backendServiceId: s._id || s.id,
        title: s.title || s.name,
        price: Number(s.price) || 499,
        originalPrice: s.originalPrice ? Number(s.originalPrice) : undefined,
        rating: s.rating || '4.8',
        reviews: s.reviews || '500+ reviews',
        duration: s.duration ? `${s.duration} mins` : '45 mins',
        image: s.icon ? toAssetUrl(s.icon) : null,
        bullets: Array.isArray(s.features) && s.features.length > 0
          ? s.features
          : [s.description || 'Verified expert service with warranty']
      }));

      sections = [
        ...sections,
        {
          id: 'live-catalog',
          title: 'Specialty Services',
          items: liveItems
        }
      ];
    }

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
  }, [catalogConfig.sections, backendServices, searchQuery]);

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

  // Smooth scroll to a section
  const scrollToSection = useCallback((sectionId) => {
    setActiveSubTab(sectionId);
    const el = sectionRefs.current[sectionId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setIsMenuOpen(false);
  }, []);

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
            {catalogConfig.subCategories?.length > 0 && (
              <div className="mt-2.5 border-y border-gray-100 bg-white py-3">
                <div className="flex items-start gap-3.5 overflow-x-auto px-4 scrollbar-hide overscroll-x-contain">
                  {catalogConfig.subCategories.map((sub) => {
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
                              className="w-full h-full object-cover rounded-xl"
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

                      return (
                        <div
                          key={item.id}
                          className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs hover:shadow-sm transition-shadow relative"
                        >
                          {/* PACKAGE Badge */}
                          {item.isPackage && (
                            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#00875A] uppercase tracking-wider mb-1.5">
                              <FiBookmark className="w-3.5 h-3.5 fill-[#00875A] stroke-none text-[#00875A]" />
                              PACKAGE
                            </div>
                          )}

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
                                <span className="text-[15px] sm:text-[16px] font-bold text-gray-900">
                                  ₹{item.price?.toLocaleString?.() || item.price}
                                </span>
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

                              {/* Bullet points */}
                              {item.bullets && item.bullets.length > 0 && (
                                <ul className="mt-2.5 space-y-1.5 text-[12px] text-gray-600 border-t border-gray-100 pt-2.5 leading-relaxed">
                                  {item.bullets.map((bullet, idx) => (
                                    <li key={idx} className="flex items-start gap-1.5 leading-snug">
                                      <span className="text-gray-400 shrink-0">•</span>
                                      <span>{bullet}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}

                              {/* Action link: Edit package / View details */}
                              <div className="mt-3">
                                {item.isPackage ? (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedItemDetails(item)}
                                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-[12px] font-semibold text-gray-800 hover:bg-gray-50 transition-colors cursor-pointer"
                                  >
                                    Edit your package
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedItemDetails(item)}
                                    className="text-[12px] font-bold text-[#6B38FB] hover:underline cursor-pointer"
                                  >
                                    View details
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Right Action Box (Discount Box + Add Button) */}
                            <div className="flex flex-col items-center justify-between shrink-0 w-22 sm:w-24">
                              {/* Discount Badge Box */}
                              {item.discount ? (
                                <div className="w-full h-14 rounded-xl bg-[#EBFBF2] border border-[#C6F0D6] flex flex-col items-center justify-center text-center mb-2">
                                  <span className="text-[15px] sm:text-[16px] font-extrabold text-[#00875A] leading-tight">
                                    {item.discount}
                                  </span>
                                </div>
                              ) : item.image ? (
                                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden mb-2 bg-gray-50 border border-gray-100">
                                  <ImageWithFallback
                                    src={item.image}
                                    alt={item.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="h-4" />
                              )}

                              {/* ADD / QUANTITY STEPPER BUTTON */}
                              {quantity > 0 ? (
                                <div className="flex items-center justify-between w-full h-8 px-2 rounded-xl bg-[#6B38FB] text-white shadow-xs">
                                  <button
                                    type="button"
                                    onClick={(e) => handleDecrement(item, e)}
                                    className="p-1 hover:bg-white/20 rounded active:scale-95"
                                  >
                                    <FiMinus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="text-[13px] font-bold">
                                    {quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => handleIncrement(item, e)}
                                    className="p-1 hover:bg-white/20 rounded active:scale-95"
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

                              {item.optionsCount && (
                                <span className="text-[10px] text-gray-400 mt-1">
                                  {item.optionsCount}
                                </span>
                              )}
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
            {Boolean(selectedItemDetails) && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedItemDetails(null)}
                  className="fixed inset-0 z-[10010] bg-black/60 backdrop-blur-[2px]"
                />
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  className="fixed inset-x-0 bottom-0 z-[10020] bg-white rounded-t-3xl max-w-lg mx-auto shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
                >
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-[17px] font-bold text-gray-900 truncate">
                      {selectedItemDetails.title}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setSelectedItemDetails(null)}
                      className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100"
                    >
                      <FiX className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-5 overflow-y-auto space-y-4 text-gray-700 text-[13px] leading-relaxed">
                    <div className="flex items-center gap-2">
                      <span className="text-[18px] font-bold text-gray-900">
                        ₹{selectedItemDetails.price?.toLocaleString?.() || selectedItemDetails.price}
                      </span>
                      {selectedItemDetails.originalPrice && (
                        <span className="text-[14px] line-through text-gray-400">
                          ₹{selectedItemDetails.originalPrice?.toLocaleString?.() || selectedItemDetails.originalPrice}
                        </span>
                      )}
                      {selectedItemDetails.duration && (
                        <span className="text-[12px] text-gray-500 font-normal">
                          • {selectedItemDetails.duration}
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-gray-900 text-[14px] mb-2">
                        What's Included:
                      </h4>
                      <ul className="space-y-2">
                        {selectedItemDetails.bullets?.map((b, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <FiCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 text-purple-900">
                      <p className="font-bold text-[12px] flex items-center gap-1.5 mb-1">
                        <FiInfo className="w-3.5 h-3.5" /> Help-U Promise
                      </p>
                      <p className="text-[11px] leading-snug">
                        100% single-use sealed kits, transparent pricing, and 30-day post-service guarantee.
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          handleAddToCart(selectedItemDetails, e);
                          setSelectedItemDetails(null);
                        }}
                        className="w-full py-3.5 rounded-xl bg-[#6B38FB] text-white font-bold text-[15px] shadow-lg hover:bg-[#5b2ee0] transition-colors cursor-pointer"
                      >
                        Add to cart • ₹{selectedItemDetails.price?.toLocaleString?.() || selectedItemDetails.price}
                      </button>
                    </div>
                  </div>
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
