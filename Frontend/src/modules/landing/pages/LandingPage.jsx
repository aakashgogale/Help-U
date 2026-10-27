import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  FaGooglePlay,
  FaArrowRight,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaShieldAlt,
  FaMapMarkerAlt,
  FaFileInvoiceDollar,
  FaCheckCircle,
  FaTools,
  FaPhoneAlt,
  FaEnvelope,
  FaWhatsapp,
  FaClock,
  FaBars,
  FaTimes,
  FaUserCheck,
  FaWallet,
  FaBoxes
} from 'react-icons/fa';
import landingService from '../../../services/landingService';

const toAssetUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Local static files in public folder
  if (
    url.startsWith('/categories/') ||
    url.startsWith('/ServiceIcon/') ||
    url.startsWith('/appliance/') ||
    url.startsWith('/cleaning/') ||
    url.startsWith('/services/') ||
    url.startsWith('/helpu-') ||
    url.startsWith('/hero-')
  ) {
    return url;
  }
  const clean = url.replace('/api/upload', '/upload');
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

// Default Fallback Data (Guarantees rich display even before API responds)
const DEFAULT_CONFIG = {
  hero: {
    title: 'Genuine Parts, Expert Repairs at Your Doorstep.',
    subtitle:
      'Connect with background-verified electronics and home service professionals. Guaranteed warranty, upfront transparent pricing, and real-time live tracking.',
    badgeText: 'Indore Exclusive • India’s #1 Electronics Repair Platform',
    ctaUserText: 'Book Repair',
    ctaPartnerText: 'Join as a Partner',
    heroImageUrl: '/hero-image.png'
  },
  appLinks: {
    playStoreUrl: 'https://play.google.com/store/search?q=homestr&c=apps',
    appStoreUrl: '',
    isQrCodeVisible: true
  },
  aboutUs: {
    title: 'About Help-U',
    tagline: 'Standardizing On-Demand Repairs Across Indore',
    description:
      'Help-U is an enterprise-grade home services marketplace connecting customers with background-checked service professionals. We eliminate bargaining, unverified technicians, and fake spare parts with certified experts, genuine parts, and live doorstep tracking.',
    mission:
      'To empower local skilled technicians with modern technology while delivering safe, reliable, and guaranteed home repairs in under 60 minutes.',
    pillars: [
      {
        title: 'Certified Genuine Parts',
        desc: 'Our parts. Our warranty. Every replacement part comes directly from certified manufacturers with platform warranty.',
        icon: 'shield'
      },
      {
        title: '100% Background-Checked',
        desc: 'Every technician undergoes strict identity (Aadhaar/PAN), criminal background checks, and skill vetting.',
        icon: 'check'
      },
      {
        title: 'Live Real-Time GPS Tracking',
        desc: 'Track your assigned expert live on the map from dispatch right to your doorstep with OTP security.',
        icon: 'map'
      },
      {
        title: 'Fixed Doorstep Billing',
        desc: 'Zero hidden fees or doorstep haggling. Digital itemized invoice generated directly in your app.',
        icon: 'dollar'
      }
    ]
  },
  stats: [
    { label: 'Verified Xperts', value: '450+', color: 'text-brand' },
    { label: 'Indore Families', value: '12k+', color: 'text-white' },
    { label: 'Certified Parts', value: '1.5k+', color: 'text-brand' },
    { label: 'Reliability Score', value: '99%', color: 'text-white' }
  ],
  howItWorks: {
    userSteps: [
      {
        stepNumber: 1,
        title: 'Choose Service',
        desc: 'Select from our wide range of AC, electronics, plumbing, and home repair services.'
      },
      {
        stepNumber: 2,
        title: 'Schedule & Book',
        desc: 'Choose instant emergency dispatch or book a convenient scheduled time slot.'
      },
      {
        stepNumber: 3,
        title: 'Track Live on Map',
        desc: 'Watch your verified technician arrive live via GPS tracking with OTP check.'
      },
      {
        stepNumber: 4,
        title: 'Pay & Enjoy Warranty',
        desc: 'Pay safely via UPI, Card, Cash, or In-App Wallet and receive official warranty.'
      }
    ],
    partnerSteps: [
      {
        stepNumber: 1,
        title: 'Register in 2 Mins',
        desc: 'Sign up with your phone number, trade skills, and service city.'
      },
      {
        stepNumber: 2,
        title: 'Quick Verification',
        desc: 'Complete rapid ID check and technical assessment with our onboarding team.'
      },
      {
        stepNumber: 3,
        title: 'Receive Local Bookings',
        desc: 'Get automated booking alerts within your chosen service radius.'
      },
      {
        stepNumber: 4,
        title: 'Earn & Withdraw Daily',
        desc: 'Collect cash or wallet payments and withdraw earnings directly to your bank.'
      }
    ]
  },
  partnerSection: {
    title: 'Grow Your Business with Help-U',
    subtitle:
      'Join 450+ skilled technicians & service partners earning ₹30,000 to ₹70,000+ monthly with guaranteed leads and zero joining fees.',
    isRegistrationEnabled: true,
    perks: [
      {
        title: 'Guaranteed Daily Orders',
        desc: 'Never sit idle. Receive automated wave job dispatches in your neighborhood.'
      },
      {
        title: 'Instant & Direct Payouts',
        desc: 'Fast transparent settlements straight to your bank account with lowest commission.'
      },
      {
        title: 'Genuine Parts Supply',
        desc: 'Access platform-certified manufacturer spare parts delivered for your jobs.'
      },
      {
        title: 'Flexible Working Freedom',
        desc: 'Be your own boss. Turn on duty when available and work on your own schedule.'
      }
    ]
  },
  faqs: [
    {
      question: 'How do I book a service on Help-U?',
      answer:
        'You can book directly using our web portal or by downloading our Android app from the Google Play Store. Simply choose your service, pick a date & time slot, and confirm your address.',
      audience: 'user'
    },
    {
      question: 'Are the technicians background-verified?',
      answer:
        'Yes! Every technician undergoes a thorough government ID verification (Aadhaar/PAN), police background check, and hands-on skill assessment before taking jobs on our platform.',
      audience: 'user'
    },
    {
      question: 'What if the issue recurs after repair?',
      answer:
        'We offer an official platform warranty on certified parts and services. If the same issue happens within the warranty period, we provide a free inspection and revisit.',
      audience: 'user'
    },
    {
      question: 'Can I pay with Cash or UPI?',
      answer:
        'Both! We support Cash on Delivery, UPI (Google Pay, PhonePe, Paytm), Credit/Debit cards, Net Banking, and the in-app Help-U Wallet.',
      audience: 'user'
    },
    {
      question: 'How do I join Help-U as a Service Partner?',
      answer:
        'Fill out the partner registration form on this page with your name, phone number, trade skill, and city. Our partner onboarding team will contact you within 24 hours to complete verification.',
      audience: 'partner'
    },
    {
      question: 'How and when do Partners receive earnings?',
      answer:
        'Cash payments are collected immediately by you at the customer doorstep. Online payments are credited to your Partner Wallet instantly and can be withdrawn directly to your bank account anytime.',
      audience: 'partner'
    },
    {
      question: 'Is there any joining fee for Partners?',
      answer:
        'No! Partner registration and onboarding on Help-U is 100% free with zero joining fees. You only pay a transparent, modest commission on completed bookings.',
      audience: 'partner'
    },
    {
      question: 'Which cities does Help-U currently service?',
      answer:
        'We are currently fully operational across Indore and expanding rapidly to surrounding regions in Madhya Pradesh.',
      audience: 'both'
    }
  ],
  contact: {
    supportEmail: 'support@homestr.in',
    supportPhone: '+91 98765 43210',
    supportWhatsapp: '+91 98765 43210',
    companyAddress: 'Vijay Nagar, Scheme 54, Indore, Madhya Pradesh 452010',
    workingHours: 'Monday – Sunday: 8:00 AM – 9:00 PM',
    isContactFormEnabled: true
  },
  socialLinks: {
    facebook: 'https://facebook.com',
    instagram: 'https://instagram.com',
    twitter: 'https://twitter.com',
    linkedin: 'https://linkedin.com',
    youtube: 'https://youtube.com'
  }
};

const DEFAULT_CATEGORIES = [
  { id: 'cat-1', title: 'AC & Appliance Repair', icon: '/categories/ac-appliance.svg' },
  { id: 'cat-2', title: 'Electrician & Plumber', icon: '/categories/electrician.svg' },
  { id: 'cat-3', title: 'Cleaning & Housekeeping', icon: '/categories/cleaning.svg' },
  { id: 'cat-4', title: 'Washing Machine Repair', icon: '/ServiceIcon/washing-machine.svg' },
  { id: 'cat-5', title: 'Refrigerator Service', icon: '/ServiceIcon/refrigerator.svg' },
  { id: 'cat-6', title: 'LED TV & Electronics', icon: '/ServiceIcon/led-tv.svg' },
  { id: 'cat-7', title: 'Cooler Repair & Service', icon: '/ServiceIcon/cooler.svg' },
  { id: 'cat-8', title: 'RO & Water Purifier', icon: '/ServiceIcon/ro-purifier.svg' }
];

const LandingPage = () => {
  const scrollRef = useRef(null);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // How it works active tab: 'user' or 'partner'
  const [howItWorksTab, setHowItWorksTab] = useState('user');

  // FAQ active tab: 'user' or 'partner'
  const [faqTab, setFaqTab] = useState('user');
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // Partner Registration Form state
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    phone: '',
    email: '',
    trade: 'AC & Appliance Repair',
    city: 'Indore',
    experience: '1-3 years',
    message: ''
  });
  const [partnerSubmitting, setPartnerSubmitting] = useState(false);
  const [partnerSubmitted, setPartnerSubmitted] = useState(false);

  // Contact Form state
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'General Inquiry',
    message: ''
  });
  const [contactSubmitting, setContactSubmitting] = useState(false);

  // Reset scroll on load if not anchored
  useEffect(() => {
    if (!window.location.hash) {
      window.scrollTo(0, 0);
    }
  }, []);

  // Fetch live landing configuration from API
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    const fetchConfig = async () => {
      try {
        const data = await landingService.getLandingConfig();
        if (data?.success && data.config) {
          setConfig(prev => ({
            ...prev,
            ...data.config,
            hero: { ...prev.hero, ...data.config.hero },
            appLinks: { ...prev.appLinks, ...data.config.appLinks },
            aboutUs: {
              ...prev.aboutUs,
              ...data.config.aboutUs,
              pillars:
                data.config.aboutUs?.pillars && data.config.aboutUs.pillars.length > 0
                  ? data.config.aboutUs.pillars
                  : prev.aboutUs.pillars
            },
            stats:
              data.config.stats && data.config.stats.length > 0
                ? data.config.stats
                : prev.stats,
            howItWorks: {
              ...prev.howItWorks,
              ...data.config.howItWorks,
              userSteps:
                data.config.howItWorks?.userSteps && data.config.howItWorks.userSteps.length > 0
                  ? data.config.howItWorks.userSteps
                  : prev.howItWorks.userSteps,
              partnerSteps:
                data.config.howItWorks?.partnerSteps && data.config.howItWorks.partnerSteps.length > 0
                  ? data.config.howItWorks.partnerSteps
                  : prev.howItWorks.partnerSteps
            },
            partnerSection: {
              ...prev.partnerSection,
              ...data.config.partnerSection,
              perks:
                data.config.partnerSection?.perks && data.config.partnerSection.perks.length > 0
                  ? data.config.partnerSection.perks
                  : prev.partnerSection.perks
            },
            faqs:
              data.config.faqs && data.config.faqs.length > 0
                ? data.config.faqs
                : prev.faqs,
            contact: { ...prev.contact, ...data.config.contact }
          }));

          if (data.config.categories && data.config.categories.length > 0) {
            setCategories(data.config.categories);
          }
        }
      } catch (err) {
        console.error('Error fetching landing config:', err);
      }
    };

    fetchConfig();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Category horizontal scroll buttons
  const scroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth / 2 : scrollLeft + clientWidth / 2;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  // Submit Partner Lead
  const handlePartnerSubmit = async (e) => {
    e.preventDefault();
    if (!partnerForm.name || !partnerForm.phone || !partnerForm.trade || !partnerForm.city) {
      toast.error('Please fill in your name, phone, trade, and city.');
      return;
    }

    try {
      setPartnerSubmitting(true);
      const res = await landingService.submitPartnerLead(partnerForm);
      if (res?.success) {
        setPartnerSubmitted(true);
        toast.success('Registration successful! Our onboarding team will call you shortly.');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to submit registration. Please try again.');
    } finally {
      setPartnerSubmitting(false);
    }
  };

  // Submit Contact Form
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.name || (!contactForm.email && !contactForm.phone) || !contactForm.message) {
      toast.error('Please enter your name, contact information, and message.');
      return;
    }

    try {
      setContactSubmitting(true);
      const res = await landingService.submitContactInquiry(contactForm);
      if (res?.success) {
        toast.success('Thank you! Your message has been sent.');
        setContactForm({
          name: '',
          email: '',
          phone: '',
          subject: 'General Inquiry',
          message: ''
        });
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to send message. Please try again.');
    } finally {
      setContactSubmitting(false);
    }
  };

  const playStoreLink = config.appLinks?.playStoreUrl || 'https://play.google.com/store/search?q=homestr&c=apps';

  // Safeguarded arrays (never empty)
  const pillars =
    config.aboutUs?.pillars && config.aboutUs.pillars.length > 0
      ? config.aboutUs.pillars
      : DEFAULT_CONFIG.aboutUs.pillars;

  const stats =
    config.stats && config.stats.length > 0
      ? config.stats
      : DEFAULT_CONFIG.stats;

  const userSteps =
    config.howItWorks?.userSteps && config.howItWorks.userSteps.length > 0
      ? config.howItWorks.userSteps
      : DEFAULT_CONFIG.howItWorks.userSteps;

  const partnerSteps =
    config.howItWorks?.partnerSteps && config.howItWorks.partnerSteps.length > 0
      ? config.howItWorks.partnerSteps
      : DEFAULT_CONFIG.howItWorks.partnerSteps;

  const perks =
    config.partnerSection?.perks && config.partnerSection.perks.length > 0
      ? config.partnerSection.perks
      : DEFAULT_CONFIG.partnerSection.perks;

  const allFaqs =
    config.faqs && config.faqs.length > 0
      ? config.faqs
      : DEFAULT_CONFIG.faqs;

  // Filter FAQs based on active tab
  const filteredFaqs = allFaqs.filter((f) => {
    if (faqTab === 'user') return f.audience === 'user' || f.audience === 'both';
    if (faqTab === 'partner') return f.audience === 'partner' || f.audience === 'both';
    return true;
  });

  const navMenuItems = [
    { label: 'About Us', href: '#about-us' },
    { label: 'Services', href: '#services' },
    { label: 'Why Help-U', href: '#why-us' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'For Partners', href: '#partner' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Contact', href: '#contact' }
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-brand selection:text-white">
      {/* ============================================================ */}
      {/* 1. STICKY HEADER & NAVBAR */}
      {/* ============================================================ */}
      <header
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
          isScrolled ? 'bg-white/95 backdrop-blur-md shadow-sm py-3 border-b border-gray-100' : 'bg-white py-4'
        }`}
      >
        <div className="container mx-auto px-4 sm:px-8 max-w-7xl flex items-center justify-between">
          <Link to="/Home" className="flex items-center gap-3 group">
            <img
              src="/helpu-logo.png"
              alt="Help-U Logo"
              className="h-10 sm:h-12 w-auto transition-transform group-hover:scale-105"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <span className="font-extrabold text-2xl tracking-tight text-gray-900 flex items-center">
              Help<span className="text-brand">-U</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-gray-700">
            {navMenuItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="hover:text-brand transition-colors duration-200 relative py-1"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Header Action Button (Play Store Link) */}
          <div className="hidden sm:flex items-center gap-3">
            <a
              href="#partner"
              className="text-xs font-semibold text-gray-700 hover:text-brand px-3 py-2 transition-colors"
            >
              Earn with Us
            </a>
            <a
              href={playStoreLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-full text-xs font-bold hover:bg-brand transition-all shadow-md active:scale-95"
            >
              <FaGooglePlay className="text-sm" /> Get the App
            </a>
          </div>

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-gray-800 text-xl focus:outline-none"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white border-b border-gray-200 px-6 py-6 space-y-4 shadow-xl"
            >
              {navMenuItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-sm font-semibold text-gray-800 hover:text-brand py-1"
                >
                  {item.label}
                </a>
              ))}
              <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
                <a
                  href={playStoreLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-xl text-xs font-bold"
                >
                  <FaGooglePlay /> Download on Play Store
                </a>
                <Link
                  to="/user"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-center bg-brand text-white py-3 rounded-xl text-xs font-bold"
                >
                  Order Service Web
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ============================================================ */}
      {/* 2. HERO SECTION WITH DUAL CTA & LIVE BADGE */}
      {/* ============================================================ */}
      <section
        id="hero"
        className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 bg-gradient-to-b from-gray-50/80 via-white to-white overflow-hidden"
      >
        <div className="absolute top-10 right-0 w-96 h-96 bg-brand/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
        <div className="absolute top-40 left-0 w-80 h-80 bg-orange-500/5 blur-[100px] rounded-full pointer-events-none -z-10"></div>

        <div className="container mx-auto px-4 sm:px-8 max-w-7xl">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left Column: Headlines & CTA */}
            <div className="flex-1 text-center lg:text-left">
              {/* Partner Banner Pill */}
              <a
                href="#partner"
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand/10 border border-brand/20 text-brand rounded-full mb-6 text-xs font-bold hover:bg-brand/20 transition-colors"
              >
                <span>🛠️ Skilled Technician or Contractor?</span>
                <span className="underline">Register as Partner &rarr;</span>
              </a>

              <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 leading-[1.15] mb-6">
                {config.hero?.title}
              </h1>

              <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
                {config.hero?.subtitle}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center mb-8">
                <a
                  href={playStoreLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-gray-900 text-white px-8 py-4 rounded-2xl text-sm font-bold hover:bg-brand transition-all shadow-xl active:scale-95 group"
                >
                  <FaGooglePlay className="text-xl group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <div className="text-[10px] text-gray-400 font-normal leading-none">GET IT ON</div>
                    <div className="text-sm font-bold leading-tight">Google Play</div>
                  </div>
                </a>

                <Link
                  to="/user"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand text-white px-8 py-4 rounded-2xl text-sm font-bold hover:bg-gray-900 transition-all shadow-lg active:scale-95"
                >
                  {config.hero?.ctaUserText || 'Book Repair'} <FaArrowRight />
                </Link>
              </div>

              {/* Quick Trust Highlights */}
              <div className="inline-flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-semibold text-gray-500">
                <span className="flex items-center gap-1.5">
                  <FaCheckCircle className="text-green-500" /> Platform Warranty
                </span>
                <span className="flex items-center gap-1.5">
                  <FaCheckCircle className="text-green-500" /> Verified Technicians
                </span>
                <span className="flex items-center gap-1.5">
                  <FaCheckCircle className="text-green-500" /> Live GPS Tracking
                </span>
              </div>
            </div>

            {/* Right Column: Hero Visual with Warranty Shield */}
            <div className="flex-1 w-full max-w-lg lg:max-w-none relative">
              <div className="relative p-3 bg-white rounded-[3rem] border border-gray-100 shadow-2xl overflow-hidden group">
                <div className="overflow-hidden rounded-[2.5rem] aspect-[4/3] sm:aspect-[16/11] relative bg-gray-100">
                  <img
                    src={config.hero?.heroImageUrl || '/hero-image.png'}
                    alt="Help-U Verified Services"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => {
                      e.target.src =
                        'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=1000';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent"></div>
                </div>

                {/* Floating Trust Badge */}
                <div className="absolute bottom-6 left-6 right-6 bg-gray-900/90 backdrop-blur-md p-4 sm:p-5 rounded-2xl text-white shadow-2xl border border-white/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand rounded-full flex items-center justify-center text-white shadow-lg text-lg sm:text-xl">
                      <FaShieldAlt />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                        Platform Guarantee
                      </p>
                      <p className="text-xs sm:text-sm font-bold">100% Certified Genuine Parts</p>
                    </div>
                  </div>
                  <span className="hidden sm:inline-block bg-white/10 text-brand text-xs font-bold px-3 py-1 rounded-full">
                    Warranty
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. PLATFORM STATS STRIP */}
      {/* ============================================================ */}
      <section className="py-10 sm:py-14 bg-gray-900 text-white relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-8 max-w-7xl">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className="text-center border-r border-white/10 last:border-0 lg:border-r p-2"
              >
                <div className="text-3xl sm:text-5xl font-extrabold mb-1 tracking-tight text-brand">
                  {stat.value}
                </div>
                <div className="text-gray-400 text-xs sm:text-sm font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. ABOUT US & TRUST PILLARS */}
      {/* ============================================================ */}
      <section id="about-us" className="py-20 sm:py-28 bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 sm:px-8 max-w-7xl">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="text-brand font-bold text-xs uppercase tracking-widest block mb-2">
              Who We Are
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              {config.aboutUs?.title || 'About Help-U'}
            </h2>
            <p className="text-gray-600 text-base sm:text-lg leading-relaxed">
              {config.aboutUs?.description}
            </p>
          </div>

          {/* 4 Pillars Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {pillars.map((pillar, idx) => (
              <div
                key={idx}
                className="p-6 sm:p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:border-brand/30 hover:shadow-xl transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center text-xl mb-5 group-hover:scale-110 group-hover:bg-brand group-hover:text-white transition-all">
                  {idx === 0 && <FaShieldAlt />}
                  {idx === 1 && <FaUserCheck />}
                  {idx === 2 && <FaMapMarkerAlt />}
                  {idx === 3 && <FaFileInvoiceDollar />}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{pillar.title}</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. POPULAR SERVICES GRID */}
      {/* ============================================================ */}
      <section id="services" className="py-20 sm:py-28 bg-gray-50/60">
        <div className="container mx-auto px-4 sm:px-8 max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
            <div>
              <span className="text-brand font-bold text-xs uppercase tracking-widest block mb-2">
                Our Catalog
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
                Explore Expert Services
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Book verified professionals with guaranteed warranty across Indore
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center gap-2">
              <button
                onClick={() => scroll('left')}
                className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-brand hover:border-brand transition-all shadow-sm"
                aria-label="Scroll left"
              >
                <FaChevronLeft />
              </button>
              <button
                onClick={() => scroll('right')}
                className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-brand hover:border-brand transition-all shadow-sm"
                aria-label="Scroll right"
              >
                <FaChevronRight />
              </button>
            </div>
          </div>

          {/* Carousel scroll */}
          <div
            ref={scrollRef}
            className="overflow-x-auto scrollbar-hide scroll-smooth py-2 -mx-2 px-2"
          >
            <div className="flex gap-5 min-w-max">
              {categories.map((cat, idx) => (
                <Link
                  key={cat.id || idx}
                  to="/user"
                  state={{ openCategoryId: cat.id }}
                  className="w-52 bg-white rounded-3xl p-6 border border-gray-100 hover:border-brand/30 hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center group cursor-pointer"
                >
                  <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center p-4 mb-4 group-hover:scale-110 transition-transform">
                    {cat.icon ? (
                      <img
                        src={toAssetUrl(cat.icon)}
                        alt={cat.title}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <FaTools className="text-3xl text-brand" />
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-gray-900 group-hover:text-brand transition-colors">
                    {cat.title}
                  </h3>
                  <span className="text-[11px] text-gray-400 mt-1 flex items-center gap-1 group-hover:text-brand">
                    Book Now <FaArrowRight className="text-[9px]" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. HOW IT WORKS (TABBED: CUSTOMERS VS PARTNERS) */}
      {/* ============================================================ */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 sm:px-8 max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-brand font-bold text-xs uppercase tracking-widest block mb-2">
              Simple Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6">
              How Help-U Works
            </h2>

            {/* Persona Switcher Tabs */}
            <div className="inline-flex rounded-full bg-gray-100 p-1.5 border border-gray-200">
              <button
                type="button"
                onClick={() => setHowItWorksTab('user')}
                className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all ${
                  howItWorksTab === 'user'
                    ? 'bg-gray-900 text-white shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                👤 For Customers
              </button>
              <button
                type="button"
                onClick={() => setHowItWorksTab('partner')}
                className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all ${
                  howItWorksTab === 'partner'
                    ? 'bg-brand text-white shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🛠️ For Service Partners
              </button>
            </div>
          </div>

          {/* Steps Timeline Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(howItWorksTab === 'user' ? userSteps : partnerSteps).map((st, idx) => (
              <div
                key={idx}
                className="relative p-8 rounded-3xl bg-gray-50 border border-gray-100 flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-extrabold text-lg mb-6 shadow-md">
                    0{idx + 1}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{st.title}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{st.desc}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200/60 flex items-center gap-1.5 text-brand text-xs font-bold">
                  <span>Step {idx + 1}</span>
                  <FaArrowRight className="text-[10px]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 7. APP SHOWCASE & PLAY STORE DOWNLOAD STRIP */}
      {/* ============================================================ */}
      <section id="why-us" className="py-20 sm:py-28 bg-gray-900 text-white overflow-hidden relative">
        <div className="container mx-auto px-4 sm:px-8 max-w-7xl">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="max-w-xl text-center lg:text-left">
              <span className="text-brand font-bold text-xs uppercase tracking-widest block mb-3">
                Mobile First Experience
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold mb-6 leading-tight">
                Quality Home Repair is <br />
                <span className="text-brand">Just a Tap Away.</span>
              </h2>
              <p className="text-gray-400 text-base leading-relaxed mb-8">
                Download the official Help-U Android app for instant emergency bookings, live technician map tracking, digital receipts, and hassle-free wallet payments.
              </p>

              {/* Download badge & QR code */}
              <div className="flex flex-col sm:flex-row items-center gap-6 justify-center lg:justify-start">
                <a
                  href={playStoreLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-white text-gray-900 px-8 py-4 rounded-2xl font-bold text-sm hover:bg-brand hover:text-white transition-all shadow-xl active:scale-95 group"
                >
                  <FaGooglePlay className="text-2xl text-gray-900 group-hover:text-white" />
                  <div className="text-left">
                    <div className="text-[10px] text-gray-500 leading-none">FREE ON</div>
                    <div className="text-base font-extrabold">Google Play Store</div>
                  </div>
                </a>

                {config.appLinks?.isQrCodeVisible !== false && (
                  <div className="hidden sm:flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-2xl">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(
                        playStoreLink
                      )}`}
                      alt="Scan to Download Help-U"
                      className="w-14 h-14 rounded-lg bg-white p-1"
                    />
                    <div className="text-left text-xs">
                      <div className="font-bold text-white">Scan with Camera</div>
                      <div className="text-gray-400 text-[10px]">Instant Play Store install</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* App Screen Mockup */}
            <div className="w-full max-w-sm relative">
              <div className="p-3 bg-gray-800 rounded-[3rem] border border-white/10 shadow-2xl">
                <div className="aspect-[9/16] rounded-[2.5rem] bg-gray-900 overflow-hidden relative">
                  <img
                    src="/helpu-user.png"
                    alt="Help-U Mobile Application"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src =
                        'https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&q=80&w=800';
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 8. DEDICATED PARTNER SECTION & REGISTRATION FORM */}
      {/* ============================================================ */}
      <section id="partner" className="py-20 sm:py-32 bg-gray-50 relative">
        <div className="container mx-auto px-4 sm:px-8 max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-brand font-bold text-xs uppercase tracking-widest block mb-2">
              For Skilled Professionals
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-gray-900 mb-4">
              {config.partnerSection?.title || 'Grow Your Business with Help-U'}
            </h2>
            <p className="text-gray-600 text-base leading-relaxed">
              {config.partnerSection?.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left Column: Partner Perks */}
            <div className="lg:col-span-6 space-y-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Why Top Technicians Choose Help-U
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {perks.map((perk, idx) => (
                  <div
                    key={idx}
                    className="p-6 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center text-lg mb-4">
                      {idx === 0 && <FaTools />}
                      {idx === 1 && <FaWallet />}
                      {idx === 2 && <FaBoxes />}
                      {idx === 3 && <FaClock />}
                    </div>
                    <h4 className="font-bold text-base text-gray-900 mb-1">{perk.title}</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">{perk.desc}</p>
                  </div>
                ))}
              </div>

              {/* Partner App direct download prompt */}
              <div className="p-6 rounded-3xl bg-brand/10 border border-brand/20 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-gray-900">Have a Partner Account?</h4>
                  <p className="text-xs text-gray-600">Access your partner dashboard and active jobs.</p>
                </div>
                <Link
                  to="/worker/login"
                  className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-brand transition-colors whitespace-nowrap"
                >
                  Partner Login
                </Link>
              </div>
            </div>

            {/* Right Column: Live Partner Registration Lead Form */}
            <div className="lg:col-span-6">
              <div className="bg-white p-8 sm:p-10 rounded-3xl border border-gray-200 shadow-xl">
                <div className="mb-6">
                  <h3 className="text-2xl font-extrabold text-gray-900 mb-1">
                    Register as a Service Partner
                  </h3>
                  <p className="text-xs text-gray-500">
                    Takes 2 minutes. Free registration with zero joining charges.
                  </p>
                </div>

                {partnerSubmitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-8 text-center bg-green-50 rounded-2xl border border-green-200"
                  >
                    <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                      <FaCheckCircle />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">Registration Received!</h4>
                    <p className="text-sm text-gray-600 mb-6">
                      Thank you for joining Help-U. Our partner onboarding manager will call your phone number within 24 hours to verify documents and activate your account.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setPartnerSubmitted(false);
                        setPartnerForm({
                          name: '',
                          phone: '',
                          email: '',
                          trade: 'AC & Appliance Repair',
                          city: 'Indore',
                          experience: '1-3 years',
                          message: ''
                        });
                      }}
                      className="text-xs font-bold text-brand hover:underline"
                    >
                      Register another partner profile &rarr;
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handlePartnerSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Rahul Sharma"
                          value={partnerForm.name}
                          onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-xs text-gray-900 focus:border-brand focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Mobile Number *
                        </label>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          placeholder="10-digit phone number"
                          value={partnerForm.phone}
                          onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-xs text-gray-900 focus:border-brand focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Primary Trade / Skill *
                        </label>
                        <select
                          value={partnerForm.trade}
                          onChange={(e) => setPartnerForm({ ...partnerForm, trade: e.target.value })}
                          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-xs text-gray-900 focus:border-brand focus:outline-none bg-white"
                        >
                          <option value="AC & Appliance Repair">AC & Appliance Repair</option>
                          <option value="Electrician">Electrician</option>
                          <option value="Plumbing">Plumbing</option>
                          <option value="Electronics & TV">Electronics & TV</option>
                          <option value="Cleaning & Pest Control">Cleaning & Pest Control</option>
                          <option value="Carpenter & Painting">Carpenter & Painting</option>
                          <option value="Other Trade">Other Skilled Trade</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          City *
                        </label>
                        <input
                          type="text"
                          required
                          value={partnerForm.city}
                          onChange={(e) => setPartnerForm({ ...partnerForm, city: e.target.value })}
                          placeholder="Indore"
                          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-xs text-gray-900 focus:border-brand focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Experience Level
                        </label>
                        <select
                          value={partnerForm.experience}
                          onChange={(e) =>
                            setPartnerForm({ ...partnerForm, experience: e.target.value })
                          }
                          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-xs text-gray-900 focus:border-brand focus:outline-none bg-white"
                        >
                          <option value="1-2 years">1 – 2 years</option>
                          <option value="3-5 years">3 – 5 years</option>
                          <option value="5+ years">5+ years (Expert)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Email (Optional)
                        </label>
                        <input
                          type="email"
                          placeholder="partner@example.com"
                          value={partnerForm.email}
                          onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })}
                          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-xs text-gray-900 focus:border-brand focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={partnerSubmitting}
                      className="w-full py-4 bg-[#163B66] text-white rounded-2xl text-sm font-bold hover:bg-gray-900 transition-all shadow-lg active:scale-95 disabled:opacity-50 mt-2"
                    >
                      {partnerSubmitting ? 'Submitting Registration...' : 'Register as Partner &rarr;'}
                    </button>
                    <p className="text-[11px] text-gray-400 text-center">
                      By registering, you agree to our Partner Guidelines & Code of Conduct.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 9. FREQUENTLY ASKED QUESTIONS (CUSTOMER & PARTNER ACCORDION) */}
      {/* ============================================================ */}
      <section id="faq" className="py-20 sm:py-28 bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 sm:px-8 max-w-4xl">
          <div className="text-center mb-12">
            <span className="text-brand font-bold text-xs uppercase tracking-widest block mb-2">
              Got Questions?
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6">
              Frequently Asked Questions
            </h2>

            {/* FAQ Tabs */}
            <div className="inline-flex rounded-full bg-gray-100 p-1.5 border border-gray-200">
              <button
                type="button"
                onClick={() => setFaqTab('user')}
                className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all ${
                  faqTab === 'user'
                    ? 'bg-gray-900 text-white shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Customer Questions
              </button>
              <button
                type="button"
                onClick={() => setFaqTab('partner')}
                className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all ${
                  faqTab === 'partner'
                    ? 'bg-brand text-white shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Partner Questions
              </button>
            </div>
          </div>

          {/* Accordion List */}
          <div className="space-y-4">
            {filteredFaqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-gray-200 bg-white transition-all overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 focus:outline-none"
                  >
                    <span className="font-bold text-sm sm:text-base text-gray-900">
                      {faq.question}
                    </span>
                    <span
                      className={`w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 transition-transform ${
                        isOpen ? 'rotate-180 bg-brand text-white' : ''
                      }`}
                    >
                      <FaChevronDown className="text-xs" />
                    </span>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-5 sm:px-6 pb-6 text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-3"
                      >
                        {faq.answer}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 10. CONTACT US & DIRECT SUPPORT CHANNELS */}
      {/* ============================================================ */}
      <section id="contact" className="py-20 sm:py-28 bg-gray-50/70">
        <div className="container mx-auto px-4 sm:px-8 max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-brand font-bold text-xs uppercase tracking-widest block mb-2">
              We're Here For You
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">Contact Us</h2>
            <p className="text-gray-600 text-sm">
              Reach our customer care or visit our central Indore operations office.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Contact Details Cards */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-6 rounded-3xl bg-white border border-gray-200 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg shrink-0">
                  <FaPhoneAlt />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900 mb-1">Customer Helpline</h4>
                  <p className="text-xs text-gray-500 mb-2">Direct telephone support for booking assistance</p>
                  <a
                    href={`tel:${config.contact?.supportPhone || '+919876543210'}`}
                    className="text-sm font-extrabold text-brand hover:underline"
                  >
                    {config.contact?.supportPhone || '+91 98765 43210'}
                  </a>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-gray-200 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center text-xl shrink-0">
                  <FaWhatsapp />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900 mb-1">WhatsApp Chat</h4>
                  <p className="text-xs text-gray-500 mb-2">Instant messaging support & technician updates</p>
                  <a
                    href={`https://wa.me/91${(config.contact?.supportWhatsapp || '9876543210').replace(
                      /\D/g,
                      ''
                    ).slice(-10)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold bg-green-500 text-white px-4 py-2 rounded-xl hover:bg-green-600 transition-colors"
                  >
                    <FaWhatsapp /> Chat on WhatsApp
                  </a>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-gray-200 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg shrink-0">
                  <FaEnvelope />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900 mb-1">Official Email</h4>
                  <p className="text-xs text-gray-500 mb-2">Billing, enterprise & partner escalations</p>
                  <a
                    href={`mailto:${config.contact?.supportEmail || 'support@homestr.in'}`}
                    className="text-xs font-bold text-gray-900 hover:text-brand"
                  >
                    {config.contact?.supportEmail || 'support@homestr.in'}
                  </a>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-gray-200 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg shrink-0">
                  <FaClock />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900 mb-1">Working Hours</h4>
                  <p className="text-xs text-gray-600">
                    {config.contact?.workingHours || 'Monday – Sunday: 8:00 AM – 9:00 PM'}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {config.contact?.companyAddress || 'Indore, MP'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Contact Form */}
            <div className="lg:col-span-7 bg-white p-8 sm:p-10 rounded-3xl border border-gray-200 shadow-sm">
              <h3 className="text-xl font-extrabold text-gray-900 mb-2">Send Us a Direct Message</h3>
              <p className="text-xs text-gray-500 mb-6">
                Have a question or request? Drop a message and our team will get back to you.
              </p>

              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Anand Jain"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-xs text-gray-900 focus:border-brand focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Mobile Number / Email *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Phone or email"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-xs text-gray-900 focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    placeholder="General Inquiry"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-xs text-gray-900 focus:border-brand focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Message *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="How can we help you today?"
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-xs text-gray-900 focus:border-brand focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={contactSubmitting}
                  className="px-8 py-3.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-brand transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {contactSubmitting ? 'Sending...' : 'Send Message &rarr;'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 11. DYNAMIC FOOTER */}
      {/* ============================================================ */}
      <footer className="py-16 bg-gray-950 text-white border-t border-gray-800">
        <div className="container mx-auto px-4 sm:px-8 max-w-7xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            {/* Brand Col */}
            <div className="lg:col-span-2 space-y-4">
              <Link to="/Home" className="flex items-center gap-2">
                <img
                  src="/helpu-logo.png"
                  alt="Help-U Logo"
                  className="h-10 w-auto"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <span className="font-extrabold text-2xl tracking-tight text-white">
                  Help<span className="text-brand">-U</span>
                </span>
              </Link>
              <p className="text-gray-400 text-xs leading-relaxed max-w-sm">
                Enterprise on-demand technical services marketplace. Certified genuine spare parts, transparent doorstep billing, and background-checked technicians across Indore.
              </p>
              <div className="pt-2">
                <a
                  href={playStoreLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white hover:text-gray-900 text-white border border-white/20 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                >
                  <FaGooglePlay /> Download Android App
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand mb-4">
                Explore
              </h4>
              <ul className="space-y-2.5 text-xs text-gray-400">
                <li>
                  <a href="#about-us" className="hover:text-white transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#services" className="hover:text-white transition-colors">
                    Service Catalog
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-white transition-colors">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#partner" className="hover:text-white transition-colors">
                    Become a Partner
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-white transition-colors">
                    Frequently Asked Questions
                  </a>
                </li>
                <li>
                  <a href="#contact" className="hover:text-white transition-colors">
                    Contact & Support
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand mb-4">
                Legal & Safety
              </h4>
              <ul className="space-y-2.5 text-xs text-gray-400">
                <li>
                  <Link to="/user/terms" className="hover:text-white transition-colors">
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link to="/user/privacy-policy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/user/cancellation-policy" className="hover:text-white transition-colors">
                    Cancellation & Refunds
                  </Link>
                </li>
                <li>
                  <Link to="/worker/login" className="hover:text-white transition-colors">
                    Worker Partner Portal
                  </Link>
                </li>
              </ul>
            </div>

            {/* City & Contact Info */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand mb-4">
                Headquarters
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed mb-3">
                {config.contact?.companyAddress || 'Indore, Madhya Pradesh 452010'}
              </p>
              <p className="text-xs text-gray-400 mb-1">
                Helpline:{' '}
                <a
                  href={`tel:${config.contact?.supportPhone || '+919876543210'}`}
                  className="text-white hover:underline"
                >
                  {config.contact?.supportPhone || '+91 98765 43210'}
                </a>
              </p>
              <p className="text-xs text-gray-400">
                Email:{' '}
                <a
                  href={`mailto:${config.contact?.supportEmail || 'support@homestr.in'}`}
                  className="text-white hover:underline"
                >
                  {config.contact?.supportEmail || 'support@homestr.in'}
                </a>
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-gray-500">
            <p>© {new Date().getFullYear()} Help-U Technologies. All rights reserved.</p>
            <p className="flex items-center gap-1">
              Proudly built in Indore 🇮🇳 • Designed for Speed, Safety & Reliability
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
