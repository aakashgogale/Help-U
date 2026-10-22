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
// =========================================================================; module.exports = CATALOG_DATA;