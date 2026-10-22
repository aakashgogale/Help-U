const mongoose = require('mongoose');
require('dotenv').config();
const Category = require('../models/Category');

async function seedAllComplete() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // 1. Root categories (10 primary services)
  const rootCategories = [
    {
      slug: 'womens-salon',
      title: "Women's Salon & Spa",
      homeIconUrl: '/categories/womens-salon.png',
      etaDefaultMinutes: 55,
      displayRating: '4.89',
      bookingsLabel: '2.1 M bookings',
      homeOrder: 1,
      showOnHome: true,
      hasBrands: false,
      status: 'active',
      heroBanner: {
        tag: 'LUXE BEAUTY',
        title: 'Korean Glass Glow Facial',
        startingPrice: '799',
        imageUrl: '/services/hair-studio-facial.jpg'
      }
    },
    {
      slug: 'mens-salon',
      title: "Men's Salon & Massage",
      homeIconUrl: '/categories/mens-salon.png',
      etaDefaultMinutes: 45,
      displayRating: '4.86',
      bookingsLabel: '1.2 M bookings',
      homeOrder: 2,
      showOnHome: true,
      hasBrands: false,
      status: 'active',
      heroBanner: {
        tag: 'TRENDING',
        title: 'Beard Grooming & Haircut Styling',
        startingPrice: '299',
        imageUrl: '/services/mens-salon/haircut.jpg'
      }
    },
    {
      slug: 'cleaning',
      title: 'Cleaning',
      homeIconUrl: '/categories/cleaning.svg',
      etaDefaultMinutes: 88,
      displayRating: '4.84',
      bookingsLabel: '1.8 M bookings',
      homeOrder: 3,
      showOnHome: true,
      hasBrands: false,
      status: 'active',
      heroBanner: {
        tag: 'Hospital Grade',
        title: 'Deep Home Disinfection & Floor Buffing',
        startingPrice: '499',
        imageUrl: '/cleaning-essentials/intense-bathroom.jpg'
      }
    },
    {
      slug: 'ac',
      title: 'AC & Appliance Repair',
      homeIconUrl: '/categories/ac-appliance.svg',
      etaDefaultMinutes: 44,
      displayRating: '4.88',
      bookingsLabel: '3.4 M bookings',
      homeOrder: 4,
      showOnHome: true,
      hasBrands: true,
      status: 'active',
      heroBanner: {
        tag: 'SUMMER READY',
        title: 'Complete AC Foam Jet Cleaning',
        startingPrice: '499',
        imageUrl: '/appliance/ac-repair.jpg'
      }
    },
    {
      slug: 'electrician-services',
      title: 'Electrician, Plumber & Carpenter',
      homeIconUrl: '/categories/electrician.svg',
      etaDefaultMinutes: 44,
      displayRating: '4.87',
      bookingsLabel: '4.2 M bookings',
      homeOrder: 5,
      showOnHome: true,
      hasBrands: false,
      status: 'active',
      heroBanner: {
        tag: 'TRUSTED EXPERTS',
        title: 'Switchboard, Fan, Tap & Door Repair',
        startingPrice: '149',
        imageUrl: '/services/electrical/switch-socket.jpg'
      }
    },
    {
      slug: 'painting',
      title: 'Painting',
      homeIconUrl: '/ServiceIcon/painting-roller.svg',
      etaDefaultMinutes: 120,
      displayRating: '4.82',
      bookingsLabel: '450K bookings',
      homeOrder: 6,
      showOnHome: true,
      hasBrands: false,
      status: 'active',
      heroBanner: {
        tag: 'EXPERT PAINTERS',
        title: 'Waterproof Wall Painting & Texture',
        startingPrice: '999',
        imageUrl: '/ServiceIcon/painting-roller.svg'
      }
    },
    {
      slug: 'nail-art-extensions',
      title: 'Nail Art & Extensions',
      homeIconUrl: '/ServiceIcon/nail-art.svg',
      etaDefaultMinutes: 60,
      displayRating: '4.89',
      bookingsLabel: '280K bookings',
      homeOrder: 7,
      showOnHome: true,
      hasBrands: false,
      status: 'active',
      heroBanner: {
        tag: 'TRENDING NAILS',
        title: 'Gel Extensions & Custom Nail Art',
        startingPrice: '599',
        imageUrl: '/ServiceIcon/nail-art.svg'
      }
    },
    {
      slug: 'water-tank-cleaning',
      title: 'Water Tank Cleaning',
      homeIconUrl: '/ServiceIcon/water-tank.svg',
      etaDefaultMinutes: 90,
      displayRating: '4.88',
      bookingsLabel: '310K bookings',
      homeOrder: 8,
      showOnHome: true,
      hasBrands: false,
      status: 'active',
      heroBanner: {
        tag: 'HYGIENIC WATER',
        title: '6-Stage UV Tank Disinfection',
        startingPrice: '799',
        imageUrl: '/ServiceIcon/water-tank.svg'
      }
    },
    {
      slug: 'car-wash-at-home',
      title: 'Car Wash at Home',
      homeIconUrl: '/ServiceIcon/car-wash.svg',
      etaDefaultMinutes: 60,
      displayRating: '4.84',
      bookingsLabel: '620K bookings',
      homeOrder: 9,
      showOnHome: true,
      hasBrands: false,
      status: 'active',
      heroBanner: {
        tag: 'DOORSTEP WASH',
        title: 'Pressure Foam Wash & Interior Vacuum',
        startingPrice: '399',
        imageUrl: '/ServiceIcon/car-wash.svg'
      }
    },
    {
      slug: 'cctv-services',
      title: 'CCTV & Security Services',
      homeIconUrl: '/ServiceIcon/cctv.svg',
      etaDefaultMinutes: 60,
      displayRating: '4.86',
      bookingsLabel: '190K bookings',
      homeOrder: 10,
      showOnHome: true,
      hasBrands: false,
      status: 'active',
      heroBanner: {
        tag: 'HOME SECURITY',
        title: 'HD CCTV Camera Setup & Online Link',
        startingPrice: '499',
        imageUrl: '/ServiceIcon/cctv.svg'
      }
    }
  ];

  const rootMap = {};
  for (const r of rootCategories) {
    const doc = await Category.findOneAndUpdate(
      { slug: r.slug },
      { $set: { ...r, parentId: null } },
      { new: true, upsert: true }
    );
    rootMap[r.slug] = doc._id;
    console.log(`Saved root category: ${doc.title} (${doc.slug}) [${doc._id}]`);
  }

  // 2. Subcategories with parent links
  const subCategories = [
    // Women's Salon Subcategories
    {
      parentSlug: 'womens-salon',
      slug: 'womens-salon-spa-for-women',
      title: 'Spa for Women',
      homeIconUrl: '/categories/spa-women.svg',
      etaDefaultMinutes: 60,
      displayRating: '4.88',
      bookingsLabel: '420K bookings',
      homeOrder: 1,
      showOnHome: true,
      status: 'active'
    },
    {
      parentSlug: 'womens-salon',
      slug: 'womens-salon-hair-studio',
      title: 'Hair Studio for Women',
      homeIconUrl: '/categories/hair-dryer.svg',
      etaDefaultMinutes: 45,
      displayRating: '4.87',
      bookingsLabel: '380K bookings',
      homeOrder: 2,
      showOnHome: true,
      status: 'active'
    },

    // Men's Salon Subcategories
    {
      parentSlug: 'mens-salon',
      slug: 'mens-salon-massage',
      title: 'Massage for Men',
      homeIconUrl: '/categories/massage-men.svg',
      etaDefaultMinutes: 45,
      displayRating: '4.85',
      bookingsLabel: '290K bookings',
      homeOrder: 1,
      showOnHome: true,
      status: 'active'
    },

    // Cleaning Subcategories
    {
      parentSlug: 'cleaning',
      slug: 'cleaning-bathroom-kitchen',
      title: 'Bathroom & Kitchen Cleaning',
      homeIconUrl: '/categories/bathroom-sink.svg',
      etaDefaultMinutes: 60,
      displayRating: '4.82',
      bookingsLabel: '890K bookings',
      homeOrder: 1,
      showOnHome: true,
      status: 'active'
    },
    {
      parentSlug: 'cleaning',
      slug: 'cleaning-sofa-carpet',
      title: 'Sofa & Carpet Cleaning',
      homeIconUrl: '/categories/sofa-cleaning.svg',
      etaDefaultMinutes: 88,
      displayRating: '4.85',
      bookingsLabel: '640K bookings',
      homeOrder: 2,
      showOnHome: true,
      status: 'active'
    },
    {
      parentSlug: 'cleaning',
      slug: 'pest-control',
      title: 'Pest Control',
      homeIconUrl: '/categories/cleaning.svg',
      etaDefaultMinutes: 60,
      displayRating: '4.78',
      bookingsLabel: '250K bookings',
      homeOrder: 3,
      showOnHome: true,
      status: 'active'
    },
    {
      parentSlug: 'cleaning',
      slug: 'home-cleaning',
      title: 'Full Home Deep Clean',
      homeIconUrl: '/categories/cleaning.svg',
      etaDefaultMinutes: 90,
      displayRating: '4.86',
      bookingsLabel: '520K bookings',
      homeOrder: 4,
      showOnHome: true,
      status: 'active'
    },

    // AC & Appliance Subcategories
    {
      parentSlug: 'ac',
      slug: 'washing-machine',
      title: 'Washing Machine',
      homeIconUrl: '/ServiceIcon/washing-machine.svg',
      etaDefaultMinutes: 64,
      displayRating: '4.86',
      bookingsLabel: '1.1 M bookings',
      homeOrder: 1,
      showOnHome: true,
      status: 'active'
    },
    {
      parentSlug: 'ac',
      slug: 'fridge',
      title: 'Refrigerator Repair',
      homeIconUrl: '/ServiceIcon/refrigerator.svg',
      etaDefaultMinutes: 64,
      displayRating: '4.84',
      bookingsLabel: '980K bookings',
      homeOrder: 2,
      showOnHome: true,
      status: 'active'
    },
    {
      parentSlug: 'ac',
      slug: 'kitchen-chimney',
      title: 'Chimney',
      homeIconUrl: '/ServiceIcon/chimney.svg',
      etaDefaultMinutes: 45,
      displayRating: '4.85',
      bookingsLabel: '420K bookings',
      homeOrder: 3,
      showOnHome: true,
      status: 'active'
    },
    {
      parentSlug: 'ac',
      slug: 'microwave',
      title: 'Microwave',
      homeIconUrl: '/ServiceIcon/microwave.svg',
      etaDefaultMinutes: 64,
      displayRating: '4.83',
      bookingsLabel: '360K bookings',
      homeOrder: 4,
      showOnHome: true,
      status: 'active'
    },
    {
      parentSlug: 'ac',
      slug: 'ro-prufier',
      title: 'RO/Water Purifier',
      homeIconUrl: '/ServiceIcon/ro-purifier.svg',
      etaDefaultMinutes: 60,
      displayRating: '4.87',
      bookingsLabel: '1.4 M bookings',
      homeOrder: 5,
      showOnHome: true,
      status: 'active'
    },
    {
      parentSlug: 'ac',
      slug: 'geyser',
      title: 'Geyser',
      homeIconUrl: '/ServiceIcon/water-heater.svg',
      etaDefaultMinutes: 45,
      displayRating: '4.85',
      bookingsLabel: '850K bookings',
      homeOrder: 6,
      showOnHome: true,
      status: 'active'
    },
    {
      parentSlug: 'ac',
      slug: 'cooler',
      title: 'Cooler',
      homeIconUrl: '/ServiceIcon/cooler.svg',
      etaDefaultMinutes: 45,
      displayRating: '4.81',
      bookingsLabel: '210K bookings',
      homeOrder: 7,
      showOnHome: true,
      status: 'active'
    },
    {
      parentSlug: 'ac',
      slug: 'led',
      title: 'LED TV',
      homeIconUrl: '/ServiceIcon/led-tv.svg',
      etaDefaultMinutes: 60,
      displayRating: '4.84',
      bookingsLabel: '520K bookings',
      homeOrder: 8,
      showOnHome: true,
      status: 'active'
    },

    // Electrician, Plumber & Carpenter Subcategories
    {
      parentSlug: 'electrician-services',
      slug: 'electrician-services-electrician',
      title: 'Electrician',
      homeIconUrl: '/categories/electrician-switch.svg',
      etaDefaultMinutes: 44,
      displayRating: '4.88',
      bookingsLabel: '1.9 M bookings',
      homeOrder: 1,
      showOnHome: true,
      status: 'active'
    },
    {
      parentSlug: 'electrician-services',
      slug: 'electrician-services-plumber',
      title: 'Plumber',
      homeIconUrl: '/categories/plumber-toilet.svg',
      etaDefaultMinutes: 44,
      displayRating: '4.86',
      bookingsLabel: '1.4 M bookings',
      homeOrder: 2,
      showOnHome: true,
      status: 'active'
    },
    {
      parentSlug: 'electrician-services',
      slug: 'electrician-services-carpenter',
      title: 'Carpenter',
      homeIconUrl: '/categories/carpenter-door.svg',
      etaDefaultMinutes: 44,
      displayRating: '4.85',
      bookingsLabel: '890K bookings',
      homeOrder: 3,
      showOnHome: true,
      status: 'active'
    },
    {
      parentSlug: 'electrician-services',
      slug: 'electrician-services-furniture-assembly',
      title: 'Furniture Assembly',
      homeIconUrl: '/categories/furniture-assembly.svg',
      etaDefaultMinutes: 60,
      displayRating: '4.86',
      bookingsLabel: '340K bookings',
      homeOrder: 4,
      showOnHome: true,
      status: 'active'
    },

    // Painting Subcategories
    {
      parentSlug: 'painting',
      slug: 'painting-wall-painting',
      title: 'Wall Painting',
      homeIconUrl: '/ServiceIcon/painting-roller.svg',
      etaDefaultMinutes: 120,
      displayRating: '4.82',
      bookingsLabel: '350K bookings',
      homeOrder: 1,
      showOnHome: true,
      status: 'active'
    },
    {
      parentSlug: 'painting',
      slug: 'painting-waterproofing',
      title: 'Waterproofing',
      homeIconUrl: '/ServiceIcon/painting-roller.svg',
      etaDefaultMinutes: 120,
      displayRating: '4.85',
      bookingsLabel: '180K bookings',
      homeOrder: 2,
      showOnHome: true,
      status: 'active'
    },

    // Nail Art Subcategories
    {
      parentSlug: 'nail-art-extensions',
      slug: 'nail-art-extensions-nail-art',
      title: 'Nail Art & Extensions',
      homeIconUrl: '/ServiceIcon/nail-art.svg',
      etaDefaultMinutes: 60,
      displayRating: '4.89',
      bookingsLabel: '280K bookings',
      homeOrder: 1,
      showOnHome: true,
      status: 'active'
    },

    // Water Tank Cleaning Subcategories
    {
      parentSlug: 'water-tank-cleaning',
      slug: 'water-tank-cleaning-tank-cleaning',
      title: 'Water Tank Cleaning',
      homeIconUrl: '/ServiceIcon/water-tank.svg',
      etaDefaultMinutes: 90,
      displayRating: '4.88',
      bookingsLabel: '310K bookings',
      homeOrder: 1,
      showOnHome: true,
      status: 'active'
    },

    // Car Wash at Home Subcategories
    {
      parentSlug: 'car-wash-at-home',
      slug: 'car-wash-at-home-car-wash',
      title: 'Car Wash at Home',
      homeIconUrl: '/ServiceIcon/car-wash.svg',
      etaDefaultMinutes: 60,
      displayRating: '4.84',
      bookingsLabel: '620K bookings',
      homeOrder: 1,
      showOnHome: true,
      status: 'active'
    },

    // CCTV Services Subcategories
    {
      parentSlug: 'cctv-services',
      slug: 'cctv-services-installation-repair',
      title: 'CCTV Installation & Repair',
      homeIconUrl: '/ServiceIcon/cctv.svg',
      etaDefaultMinutes: 60,
      displayRating: '4.86',
      bookingsLabel: '190K bookings',
      homeOrder: 1,
      showOnHome: true,
      status: 'active'
    }
  ];

  for (const s of subCategories) {
    const parentId = rootMap[s.parentSlug];
    if (!parentId) {
      console.warn(`Parent not found for: ${s.slug}`);
      continue;
    }
    const { parentSlug, ...rest } = s;
    const doc = await Category.findOneAndUpdate(
      { slug: rest.slug },
      { $set: { ...rest, parentId } },
      { new: true, upsert: true }
    );
    console.log(`Saved subcategory: ${doc.title} (${doc.slug}) -> parent: ${parentSlug} [${doc._id}]`);
  }

  // Also clean up any legacy uncategorized or misconfigured items
  await Category.updateMany(
    { slug: 'water-tank-cleaning-water-tank-cleaning' },
    { $set: { status: 'deleted' } }
  );
  await Category.updateMany(
    { slug: 'car-wash-at-home-car-wash-home' },
    { $set: { status: 'deleted' } }
  );
  await Category.updateMany(
    { slug: 'cctv-services-cctv-camera-not-working' },
    { $set: { status: 'deleted' } }
  );

  console.log('Finished seeding all categories successfully!');
  process.exit(0);
}

seedAllComplete().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
