const mongoose = require('mongoose');

const DEFAULT_PILLARS = [
  {
    title: 'Certified Genuine Parts',
    desc: 'Our parts. Our warranty. Every replacement part comes directly from certified manufacturers with platform warranty.',
    icon: 'shield'
  },
  {
    title: '100% Background Checked',
    desc: 'Every partner undergoes rigorous identity, criminal background, and skill verification.',
    icon: 'check'
  },
  {
    title: 'Live Real-Time GPS Tracking',
    desc: 'Track your assigned technician live on the map from dispatch to your front door.',
    icon: 'map'
  },
  {
    title: 'Fixed Transparent Pricing',
    desc: 'No surprise charges or doorstep bargaining. Digital invoice generated upfront.',
    icon: 'dollar'
  }
];

const DEFAULT_STATS = [
  { label: 'Verified Experts', value: '150+', color: 'text-brand' },
  { label: 'Happy Customers', value: '500+', color: 'text-white' },
  { label: 'Services Available', value: '50+', color: 'text-brand' },
  { label: 'Customer Satisfaction', value: '4.9★', color: 'text-white' }
];

const DEFAULT_USER_STEPS = [
  {
    stepNumber: 1,
    title: 'Choose Your Service',
    desc: 'Browse our extensive catalog of electronics repairs, home maintenance, and installations.'
  },
  {
    stepNumber: 2,
    title: 'Select Date & Time Slot',
    desc: 'Pick an instant emergency arrival or schedule a convenient slot for later in the week.'
  },
  {
    stepNumber: 3,
    title: 'Track Live on Map',
    desc: 'Watch your verified technician arrive live via GPS tracking with OTP verification.'
  },
  {
    stepNumber: 4,
    title: 'Pay & Enjoy Warranty',
    desc: 'Pay safely via UPI, Cards, Cash, or In-App Wallet and receive official warranty.'
  }
];

const DEFAULT_PARTNER_STEPS = [
  {
    stepNumber: 1,
    title: 'Register Your Profile',
    desc: 'Sign up in 2 minutes with your phone number, trade skills, and city.'
  },
  {
    stepNumber: 2,
    title: 'Quick Document KYC',
    desc: 'Complete rapid Aadhaar/ID and skill verification with our onboarding team.'
  },
  {
    stepNumber: 3,
    title: 'Receive Local Jobs',
    desc: 'Get wave-based instant booking alerts within your chosen service radius.'
  },
  {
    stepNumber: 4,
    title: 'Instant Bank Payouts',
    desc: 'Complete jobs, collect cash or online payments, and withdraw your earnings anytime.'
  }
];

const DEFAULT_PERKS = [
  {
    title: 'Guaranteed Daily Orders',
    desc: 'Never sit idle. Receive automated job dispatches right in your neighborhood.',
    icon: 'briefcase'
  },
  {
    title: 'Instant & Transparent Payouts',
    desc: 'Fast automated settlements directly into your bank account with low commission.',
    icon: 'wallet'
  },
  {
    title: 'Genuine Parts Supply',
    desc: 'Access certified manufacturer parts with doorstep delivery for your repair jobs.',
    icon: 'package'
  },
  {
    title: 'Flexible Work Freedom',
    desc: 'Be your own boss. Turn on duty when ready and work on your own schedule.',
    icon: 'clock'
  }
];

const DEFAULT_FAQS = [
  {
    question: 'How do I book a service on Help-U?',
    answer:
      'You can book directly by downloading our Android app from the Google Play Store or using our web booking portal. Simply select your required repair service, pick a time slot, and enter your address.',
    audience: 'user',
    order: 1,
    isActive: true
  },
  {
    question: 'Are the technicians background-verified?',
    answer:
      'Yes. Every technician on Help-U passes a rigorous multi-step background check, government ID verification (Aadhaar/PAN), and in-person technical skill assessment before being dispatched.',
    audience: 'user',
    order: 2,
    isActive: true
  },
  {
    question: 'What if an issue recurs after the repair?',
    answer:
      'We provide an official platform warranty on certified spare parts and services. If the same issue happens within the warranty period, we dispatch a senior expert for a free revisit.',
    audience: 'user',
    order: 3,
    isActive: true
  },
  {
    question: 'Can I pay via cash or online?',
    answer:
      'Both! You can pay securely online using UPI (Google Pay, PhonePe, Paytm), Credit/Debit cards, Net Banking, or choose Cash on Delivery directly to the technician after job completion.',
    audience: 'user',
    order: 4,
    isActive: true
  },
  {
    question: 'How do I register as a Service Partner?',
    answer:
      'Fill out the partner registration form on this page with your name, phone number, city, and primary trade. Our onboarding team will call you within 24 hours to complete verification.',
    audience: 'partner',
    order: 5,
    isActive: true
  },
  {
    question: 'How and when do Partners receive payments?',
    answer:
      'Cash payments are collected immediately by you at the doorstep. For online payments, earnings accumulate in your in-app Partner Wallet and can be withdrawn directly to your bank account anytime.',
    audience: 'partner',
    order: 6,
    isActive: true
  },
  {
    question: 'Do I have to pay any registration fee to join?',
    answer:
      'No! Partner onboarding on Help-U is 100% free with zero joining fees. You only pay a small transparent platform commission on successfully completed jobs.',
    audience: 'partner',
    order: 7,
    isActive: true
  },
  {
    question: 'What areas/cities does Help-U currently service?',
    answer:
      'We are currently fully operational across Indore and expanding rapidly to neighboring regions and Tier 2 cities in Madhya Pradesh.',
    audience: 'both',
    order: 8,
    isActive: true
  }
];

const DEFAULT_TESTIMONIALS = [
  {
    name: 'Aravind Sharma',
    role: 'Homeowner, Vijay Nagar',
    rating: 5,
    text: 'Help-U technician arrived in 25 minutes. Fixed my inverter AC using platform-certified parts. Clean work and official warranty invoice generated on phone.',
    type: 'user'
  },
  {
    name: 'Rajesh Verma',
    role: 'Senior Technician, AB Road',
    rating: 5,
    text: 'Joining Help-U as a service partner doubled my monthly income. The wave job alerts and instant wallet payouts give me total independence.',
    type: 'partner'
  },
  {
    name: 'Priya Patel',
    role: 'Customer, Palasia',
    rating: 5,
    text: 'Finally a home service where the pricing is 100% upfront! No haggling at the door. Live tracking on the map gave complete safety and reassurance.',
    type: 'user'
  }
];

/**
 * LandingPageConfig Model
 * Stores all configurable content, links, FAQs, and settings for the public landing page.
 */
const landingPageConfigSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      default: 'main',
      unique: true,
      index: true
    },

    // Hero Section
    hero: {
      title: {
        type: String,
        default: 'Genuine Parts, Expert Repairs at Your Doorstep.'
      },
      subtitle: {
        type: String,
        default:
          'Connect with verified electronics and home service professionals. Guaranteed warranty, upfront transparent pricing, and real-time live tracking.'
      },
      badgeText: {
        type: String,
        default: 'Indore Exclusive • India’s #1 Electronics Repair Platform'
      },
      ctaUserText: {
        type: String,
        default: 'Book a Repair'
      },
      ctaPartnerText: {
        type: String,
        default: 'Join as a Partner'
      },
      heroImageUrl: {
        type: String,
        default: '/hero-image.png'
      }
    },

    // App Download Links
    appLinks: {
      playStoreUrl: {
        type: String,
        default: 'https://play.google.com/store/search?q=Help-U%20Services&c=apps'
      },
      appStoreUrl: {
        type: String,
        default: ''
      },
      isQrCodeVisible: {
        type: Boolean,
        default: true
      }
    },

    // About Us Section
    aboutUs: {
      title: {
        type: String,
        default: 'About Help-U'
      },
      tagline: {
        type: String,
        default: 'Setting the gold standard for on-demand home & technical services'
      },
      description: {
        type: String,
        default:
          'Help-U is an enterprise-grade home services marketplace that bridges the gap between skilled service professionals and households. We eliminate haggling, unverified technicians, and counterfeit parts with certified professionals, transparent billing, and authentic components.'
      },
      mission: {
        type: String,
        default:
          'To empower local service professionals with modern tools while providing customers with reliable, guaranteed doorstep services in under 60 minutes.'
      },
      pillars: {
        type: Array,
        default: () => DEFAULT_PILLARS
      }
    },

    // Statistics Counter
    stats: {
      type: Array,
      default: () => DEFAULT_STATS
    },

    // How It Works Steps
    howItWorks: {
      userSteps: {
        type: Array,
        default: () => DEFAULT_USER_STEPS
      },
      partnerSteps: {
        type: Array,
        default: () => DEFAULT_PARTNER_STEPS
      }
    },

    // Partner Section & Onboarding
    partnerSection: {
      title: {
        type: String,
        default: 'Grow Your Business with Help-U'
      },
      subtitle: {
        type: String,
        default:
          'Join 500+ skilled technicians & service partners earning ₹30,000 to ₹70,000+ monthly with guaranteed leads and zero joining fees.'
      },
      isRegistrationEnabled: {
        type: Boolean,
        default: true
      },
      perks: {
        type: Array,
        default: () => DEFAULT_PERKS
      }
    },

    // FAQ Section (Segmented for both Users & Partners)
    faqs: {
      type: Array,
      default: () => DEFAULT_FAQS
    },

    // Contact Information
    contact: {
      supportEmail: { type: String, default: 'support@help-u.in' },
      supportPhone: { type: String, default: '+91 98765 43210' },
      supportWhatsapp: { type: String, default: '+91 98765 43210' },
      companyAddress: { type: String, default: 'Vijay Nagar, Scheme 54, Indore, MP 452010' },
      workingHours: { type: String, default: 'Monday – Sunday: 8:00 AM – 9:00 PM' },
      isContactFormEnabled: { type: Boolean, default: true }
    },

    // Social Media Links
    socialLinks: {
      facebook: { type: String, default: 'https://facebook.com' },
      instagram: { type: String, default: 'https://instagram.com' },
      twitter: { type: String, default: 'https://twitter.com' },
      linkedin: { type: String, default: 'https://linkedin.com' },
      youtube: { type: String, default: 'https://youtube.com' }
    },

    // Testimonials
    testimonials: {
      type: Array,
      default: () => DEFAULT_TESTIMONIALS
    }
  },
  { timestamps: true }
);

/**
 * Static method to fetch or initialize the single configuration document.
 * Automatically backfills any empty arrays so content is never blank.
 */
landingPageConfigSchema.statics.getOrCreateConfig = async function () {
  let doc = await this.findOne({ type: 'main' });
  if (!doc) {
    doc = await this.create({
      type: 'main',
      aboutUs: { pillars: DEFAULT_PILLARS },
      stats: DEFAULT_STATS,
      howItWorks: { userSteps: DEFAULT_USER_STEPS, partnerSteps: DEFAULT_PARTNER_STEPS },
      partnerSection: { perks: DEFAULT_PERKS },
      faqs: DEFAULT_FAQS,
      testimonials: DEFAULT_TESTIMONIALS
    });
  } else {
    let changed = false;
    if (!doc.aboutUs?.pillars || doc.aboutUs.pillars.length === 0) {
      if (!doc.aboutUs) doc.aboutUs = {};
      doc.aboutUs.pillars = DEFAULT_PILLARS;
      doc.markModified('aboutUs');
      changed = true;
    }
    if (!doc.stats || doc.stats.length === 0) {
      doc.stats = DEFAULT_STATS;
      doc.markModified('stats');
      changed = true;
    }
    if (!doc.howItWorks?.userSteps || doc.howItWorks.userSteps.length === 0) {
      if (!doc.howItWorks) doc.howItWorks = {};
      doc.howItWorks.userSteps = DEFAULT_USER_STEPS;
      doc.markModified('howItWorks');
      changed = true;
    }
    if (!doc.howItWorks?.partnerSteps || doc.howItWorks.partnerSteps.length === 0) {
      if (!doc.howItWorks) doc.howItWorks = {};
      doc.howItWorks.partnerSteps = DEFAULT_PARTNER_STEPS;
      doc.markModified('howItWorks');
      changed = true;
    }
    if (!doc.partnerSection?.perks || doc.partnerSection.perks.length === 0) {
      if (!doc.partnerSection) doc.partnerSection = {};
      doc.partnerSection.perks = DEFAULT_PERKS;
      doc.markModified('partnerSection');
      changed = true;
    }
    if (!doc.faqs || doc.faqs.length === 0) {
      doc.faqs = DEFAULT_FAQS;
      doc.markModified('faqs');
      changed = true;
    }
    if (!doc.testimonials || doc.testimonials.length === 0) {
      doc.testimonials = DEFAULT_TESTIMONIALS;
      doc.markModified('testimonials');
      changed = true;
    }
    if (changed) {
      await doc.save();
    }
  }
  return doc;
};

module.exports = mongoose.model('LandingPageConfig', landingPageConfigSchema);
