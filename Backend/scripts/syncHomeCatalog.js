/**
 * syncHomeCatalog.js
 *
 * Idempotent seed/sync script that creates every Category + Brand + Service
 * referenced on the user homepage but missing from the DB. Safe to run multiple
 * times — it only inserts what doesn't already exist (matched by slug).
 *
 * USAGE:
 *   cd Backend
 *   node scripts/syncHomeCatalog.js
 *
 * It never deletes or overwrites. Fields on an existing document are left as-is.
 */

const dotenv = require('dotenv');
const connectDB = require('../config/db');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Service = require('../models/Service');
const { SERVICE_STATUS } = require('../utils/constants');

dotenv.config();

/**
 * Catalog spec derived from user-side home sections. Edit this file to add
 * new categories or services; re-run the script to apply.
 *
 * Shape:
 *   { slug, title, badge?, order, description?, brands: [{ slug, title, services: [{ title, slug, basePrice, duration?, description? }] }] }
 */
const CATALOG = [
  {
    slug: 'womens-salon',
    title: "Women's Salon & Spa",
    homeBadge: 'Trending',
    order: 1,
    description: 'Professional salon and spa services for women at home',
    brands: [
      {
        slug: 'salon-luxe',
        title: 'Salon Luxe',
        services: [
          { title: 'Signature Facial', slug: 'wsalon-signature-facial', basePrice: 999, duration: 60 },
          { title: 'Hair Spa & Treatment', slug: 'wsalon-hair-spa', basePrice: 799, duration: 75 },
          { title: 'Full Body Waxing', slug: 'wsalon-full-wax', basePrice: 1299, duration: 90 },
          { title: 'Pedicure & Manicure Combo', slug: 'wsalon-pedi-mani', basePrice: 899, duration: 90 }
        ]
      },
      {
        slug: 'hair-studio',
        title: 'Hair Studio for Women',
        services: [
          { title: 'Haircut & Styling', slug: 'hs-haircut-style', basePrice: 599, duration: 45 },
          { title: 'Hair Colour', slug: 'hs-hair-colour', basePrice: 1499, duration: 120 },
          { title: 'Smoothening / Keratin', slug: 'hs-smoothening', basePrice: 2999, duration: 180 }
        ]
      }
    ]
  },
  {
    slug: 'womens-spa',
    title: "Women's Spa",
    order: 2,
    description: 'Relaxing spa therapies for women',
    brands: [
      {
        slug: 'spa-essentials',
        title: 'Spa Essentials',
        services: [
          { title: 'Full Body Massage', slug: 'spa-full-body', basePrice: 1499, duration: 60 },
          { title: 'Aromatherapy Massage', slug: 'spa-aroma', basePrice: 1799, duration: 75 },
          { title: 'Head & Shoulder Relaxation', slug: 'spa-head-shoulder', basePrice: 699, duration: 30 }
        ]
      }
    ]
  },
  {
    slug: 'mens-salon',
    title: "Men's Salon & Grooming",
    order: 3,
    description: 'Salon and grooming services for men at home',
    brands: [
      {
        slug: 'mens-essentials',
        title: 'Grooming Essentials',
        services: [
          { title: "Men's Haircut", slug: 'msalon-haircut', basePrice: 299, duration: 30 },
          { title: 'Beard Shaping & Styling', slug: 'msalon-beard', basePrice: 199, duration: 20 },
          { title: 'Hair Colour (Men)', slug: 'msalon-hair-colour', basePrice: 599, duration: 45 },
          { title: 'Full Face D-tan', slug: 'msalon-d-tan', basePrice: 499, duration: 30 }
        ]
      }
    ]
  },
  {
    slug: 'mens-massage',
    title: "Men's Massage",
    order: 4,
    description: 'Professional massage therapies for men',
    brands: [
      {
        slug: 'massage-pro',
        title: 'Massage Pro',
        services: [
          { title: 'Swedish Massage', slug: 'mm-swedish', basePrice: 1299, duration: 60 },
          { title: 'Deep Tissue Massage', slug: 'mm-deep-tissue', basePrice: 1599, duration: 60 },
          { title: 'Thai Massage', slug: 'mm-thai', basePrice: 1699, duration: 75 }
        ]
      }
    ]
  },
  {
    slug: 'cleaning',
    title: 'Cleaning',
    order: 5,
    description: 'Deep home, bathroom and kitchen cleaning services',
    brands: [
      {
        slug: 'home-cleaning',
        title: 'Home Cleaning',
        services: [
          { title: 'Intense bathroom cleaning', slug: 'cln-bathroom', basePrice: 499, duration: 90 },
          { title: 'Intense cleaning (2 bathroom)', slug: 'cln-two-bathroom', basePrice: 923, duration: 150 },
          { title: 'Sofa cleaning (3 seater)', slug: 'cln-sofa-3', basePrice: 499, duration: 60 },
          { title: 'Sofa cleaning (5 seater)', slug: 'cln-sofa-5', basePrice: 799, duration: 90 },
          { title: 'Kitchen deep cleaning', slug: 'cln-kitchen', basePrice: 799, duration: 120 },
          { title: 'Full home deep cleaning', slug: 'cln-full-home', basePrice: 2499, duration: 240 }
        ]
      }
    ]
  },
  {
    slug: 'ac',
    title: 'AC Service & Repair',
    order: 6,
    description: 'Air conditioner installation, service and repair',
    brands: [
      {
        slug: 'ac-service',
        title: 'AC Service',
        services: [
          { title: 'AC Service & Repair', slug: 'ac-service-repair', basePrice: 499, duration: 60 },
          { title: 'AC Deep Clean (jet wash)', slug: 'ac-deep-clean', basePrice: 799, duration: 90 },
          { title: 'AC Installation', slug: 'ac-install', basePrice: 1499, duration: 120 },
          { title: 'AC Uninstallation', slug: 'ac-uninstall', basePrice: 599, duration: 60 },
          { title: 'AC Gas Refill', slug: 'ac-gas-refill', basePrice: 1999, duration: 90 }
        ]
      }
    ]
  },
  {
    slug: 'washing-machine',
    title: 'Washing Machine',
    order: 7,
    description: 'Washing machine installation, service and repair',
    brands: [
      {
        slug: 'wm-service',
        title: 'Washing Machine Service',
        services: [
          { title: 'Washing machine repair', slug: 'wm-repair', basePrice: 299, duration: 45 },
          { title: 'Washing machine service', slug: 'wm-service', basePrice: 499, duration: 60 },
          { title: 'Annual Washer Care & Descaling Combo', slug: 'wm-annual', basePrice: 1299, duration: 90 }
        ]
      }
    ]
  },
  {
    slug: 'fridge',
    title: 'Refrigerator',
    order: 8,
    description: 'Refrigerator and fridge repair',
    brands: [
      {
        slug: 'fridge-service',
        title: 'Fridge Service',
        services: [
          { title: 'Fridge repair & service', slug: 'fridge-repair', basePrice: 349, duration: 60 },
          { title: 'Gas top-up', slug: 'fridge-gas', basePrice: 1499, duration: 90 }
        ]
      }
    ]
  },
  {
    slug: 'geyser',
    title: 'Water Heater (Geyser)',
    order: 9,
    description: 'Water heater and geyser installation + repair',
    brands: [
      {
        slug: 'geyser-service',
        title: 'Geyser Service',
        services: [
          { title: 'Geyser repair', slug: 'geyser-repair', basePrice: 799, duration: 60 },
          { title: 'Geyser installation', slug: 'geyser-install', basePrice: 599, duration: 45 }
        ]
      }
    ]
  },
  {
    slug: 'microwave',
    title: 'Microwave',
    order: 10,
    description: 'Microwave service and repair',
    brands: [
      {
        slug: 'microwave-service',
        title: 'Microwave Service',
        services: [
          { title: 'Microwave repair', slug: 'microwave-repair', basePrice: 399, duration: 45 }
        ]
      }
    ]
  },
  {
    slug: 'ro-prufier',
    title: 'R.O. / Water Purifier',
    order: 11,
    description: 'Water purifier service, installation and filter change',
    brands: [
      {
        slug: 'ro-service',
        title: 'RO Service',
        services: [
          { title: 'RO service', slug: 'ro-service', basePrice: 349, duration: 45 },
          { title: 'Annual Filter Replacement Combo', slug: 'ro-filter-combo', basePrice: 1499, duration: 60 },
          { title: 'Native Water Purifier Install', slug: 'ro-install', basePrice: 599, duration: 60 }
        ]
      }
    ]
  },
  {
    slug: 'kitchen-chimney',
    title: 'Kitchen Chimney',
    order: 12,
    description: 'Kitchen chimney cleaning and repair',
    brands: [
      {
        slug: 'chimney-service',
        title: 'Chimney Service',
        services: [
          { title: 'Chimney deep clean', slug: 'chimney-clean', basePrice: 999, duration: 90 },
          { title: 'Chimney repair', slug: 'chimney-repair', basePrice: 499, duration: 60 }
        ]
      }
    ]
  },
  {
    slug: 'electrician-services',
    title: 'Electrician Services',
    order: 13,
    description: 'Qualified electricians for home repairs',
    brands: [
      {
        slug: 'electrician',
        title: 'Electrician',
        services: [
          { title: 'Switch/socket replacement', slug: 'elec-switch', basePrice: 199, duration: 30 },
          { title: 'Fan installation', slug: 'elec-fan-install', basePrice: 299, duration: 45 },
          { title: 'Fan repair', slug: 'elec-fan-repair', basePrice: 249, duration: 45 },
          { title: 'MCB / fuse replacement', slug: 'elec-mcb', basePrice: 349, duration: 45 },
          { title: 'Light / tube installation', slug: 'elec-light', basePrice: 199, duration: 30 }
        ]
      }
    ]
  },
  {
    slug: 'plumber',
    title: 'Plumber',
    order: 14,
    description: 'Qualified plumbers for all home plumbing issues',
    brands: [
      {
        slug: 'plumbing',
        title: 'Plumbing',
        services: [
          { title: 'Tap repair', slug: 'plumb-tap', basePrice: 299, duration: 45 },
          { title: 'Basin / sink unclog', slug: 'plumb-basin', basePrice: 349, duration: 60 },
          { title: 'Toilet repair', slug: 'plumb-toilet', basePrice: 399, duration: 60 },
          { title: 'Water tank cleaning', slug: 'plumb-tank', basePrice: 799, duration: 90 }
        ]
      }
    ]
  },
  {
    slug: 'carpenter',
    title: 'Carpenter',
    order: 15,
    description: 'Carpentry and furniture repair',
    brands: [
      {
        slug: 'carpentry',
        title: 'Carpentry',
        services: [
          { title: 'Door repair', slug: 'carp-door', basePrice: 349, duration: 60 },
          { title: 'Window repair', slug: 'carp-window', basePrice: 299, duration: 60 },
          { title: 'Hinge / handle fix', slug: 'carp-hinge', basePrice: 199, duration: 30 }
        ]
      }
    ]
  },
  {
    slug: 'furniture-assembly',
    title: 'Furniture Assembly',
    order: 16,
    description: 'Flat-pack furniture assembly service',
    brands: [
      {
        slug: 'assembly',
        title: 'Assembly Pro',
        services: [
          { title: 'Bed / cot assembly', slug: 'asm-bed', basePrice: 599, duration: 90 },
          { title: 'Wardrobe assembly', slug: 'asm-wardrobe', basePrice: 999, duration: 120 },
          { title: 'Study table assembly', slug: 'asm-table', basePrice: 349, duration: 45 }
        ]
      }
    ]
  }
];

const run = async () => {
  await connectDB();
  console.log('🔌 Connected to DB\n');

  let created = { categories: 0, brands: 0, services: 0 };
  let skipped = { categories: 0, brands: 0, services: 0 };

  for (const catSpec of CATALOG) {
    // Category — findOrCreate
    let category = await Category.findOne({ slug: catSpec.slug });
    if (!category) {
      category = await Category.create({
        title: catSpec.title,
        slug: catSpec.slug,
        homeBadge: catSpec.homeBadge || null,
        showOnHome: true,
        homeOrder: catSpec.order,
        description: catSpec.description || '',
        status: SERVICE_STATUS.ACTIVE,
      });
      created.categories++;
      console.log(`✅ Category: ${catSpec.title} (/${catSpec.slug})`);
    } else {
      skipped.categories++;
      console.log(`⏭  Category exists: ${catSpec.title}`);
    }

    for (const brandSpec of (catSpec.brands || [])) {
      let brand = await Brand.findOne({ slug: brandSpec.slug });
      if (!brand) {
        brand = await Brand.create({
          title: brandSpec.title,
          slug: brandSpec.slug,
          categoryIds: [category._id],
          categoryId: category._id,
          status: SERVICE_STATUS.ACTIVE,
        });
        created.brands++;
        console.log(`   ✅ Brand: ${brandSpec.title}`);
      } else {
        // Make sure brand links to this category if missing
        const ids = (brand.categoryIds || []).map(String);
        if (!ids.includes(String(category._id))) {
          brand.categoryIds = [...(brand.categoryIds || []), category._id];
          if (!brand.categoryId) brand.categoryId = category._id;
          await brand.save();
          console.log(`   🔗 Brand re-linked: ${brandSpec.title}`);
        }
        skipped.brands++;
      }

      for (const svcSpec of (brandSpec.services || [])) {
        const exists = await Service.findOne({ slug: svcSpec.slug });
        if (!exists) {
          await Service.create({
            brandId: brand._id,
            title: svcSpec.title,
            slug: svcSpec.slug,
            basePrice: svcSpec.basePrice,
            duration: svcSpec.duration || 60,
            description: svcSpec.description || '',
            status: SERVICE_STATUS.ACTIVE,
          });
          created.services++;
          console.log(`      ✅ Service: ${svcSpec.title} — ₹${svcSpec.basePrice}`);
        } else {
          skipped.services++;
        }
      }
    }
  }

  console.log('\n──────────────────────────────');
  console.log(`Created:  categories=${created.categories}  brands=${created.brands}  services=${created.services}`);
  console.log(`Existing: categories=${skipped.categories}  brands=${skipped.brands}  services=${skipped.services}`);
  console.log('──────────────────────────────\n✅ Done');
  process.exit(0);
};

run().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
