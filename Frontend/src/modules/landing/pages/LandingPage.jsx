import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import legalPageService from '../../../services/legalPageService';
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
  FaBoxes,
  FaStar
} from 'react-icons/fa';
import landingService from '../../../services/landingService';

const toAssetUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const clean = url.trim().replace('/api/upload', '/upload');
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;

  // Local static files in frontend public directory
  const publicPrefixes = [
    '/categories', 'categories',
    '/ServiceIcon', 'ServiceIcon',
    '/appliance', 'appliance',
    '/cleaning', 'cleaning',
    '/services', 'services',
    '/spotlight', 'spotlight',
    '/noteworthy', 'noteworthy',
    '/helpu', 'helpu',
    '/hero', 'hero'
  ];

  for (const prefix of publicPrefixes) {
    if (clean.startsWith(prefix)) {
      return clean.startsWith('/') ? clean : `/${clean}`;
    }
  }

  // Backend uploads
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
  contact: {
    // Filled by the server from Admin > Settings > Support; nothing is invented here
    supportEmail: '',
    supportPhone: '',
    supportWhatsapp: '',
    companyAddress: '',
    workingHours: '',
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
  const [legalFaqs, setLegalFaqs] = useState({ user: [], partner: [] });
  useEffect(() => {
    let active = true;
    Promise.all([legalPageService.get('faq'), legalPageService.get('worker-faq')])
      .then(([customer, partner]) => {
        if (!active) return;
        setLegalFaqs({ user: customer?.page?.faqs || [], partner: partner?.page?.faqs || [] });
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

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

  // Reset scroll on load if not anchored, or smoothly scroll to anchored section
  useEffect(() => {
    if (window.location.hash) {
      const targetId = window.location.hash.replace('#', '').trim();
      setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          const headerHeight = 72;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerHeight;
          window.scrollTo({ top: Math.max(0, offsetPosition), behavior: 'smooth' });
        }
      }, 250);
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  // Programmatic smooth scroll handler with fixed header offset compensation
  const scrollToSection = (e, targetHref) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }

    setIsMobileMenuOpen(false);

    const targetId = (targetHref || '').replace('#', '').trim();
    if (!targetId) return;

    // Small delay ensures mobile menu closing animation doesn't disrupt scroll calculation
    setTimeout(() => {
      const element = document.getElementById(targetId);
      if (element) {
        const headerHeight = 72;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: 'smooth'
        });

        if (window.history && window.history.pushState) {
          window.history.pushState(null, '', `#${targetId}`);
        }
      }
    }, 60);
  };

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

  // Safeguarded arrays
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

  // The questions are the admin's Customer FAQ and Professional FAQ (Admin > Legal & Help Pages),
  // the same ones the apps show, so there is one place to edit them.
  const filteredFaqs = faqTab === 'user' ? legalFaqs.user : legalFaqs.partner;

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
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-brand selection:text-white pb-16 sm:pb-0">
      {/* ============================================================ */}
      {/* 1. STICKY HEADER & NAVBAR */}
      {/* ============================================================ */}
      <header
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
          isScrolled ? 'bg-white/95 backdrop-blur-md shadow-sm py-2.5 sm:py-3 border-b border-gray-100' : 'bg-white py-3 sm:py-4'
        }`}
      >
        <div className="container mx-auto px-4 sm:px-8 max-w-7xl flex items-center justify-between">
          <Link to="/Home" className="flex items-center gap-2 group">
            <img
              src="/helpu-logo.png"
              alt="Help-U Logo"
              className="h-8 sm:h-11 w-auto transition-transform group-hover:scale-105"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-gray-900 flex items-center">
              Help<span className="text-brand">-U</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-7 text-xs font-semibold text-gray-700">
            {navMenuItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={(e) => scrollToSection(e, item.href)}
                className="hover:text-brand transition-colors duration-200 relative py-1 cursor-pointer focus:outline-none"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Header Action Button (Play Store Link) */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => scrollToSection(e, '#partner')}
              className="text-xs font-semibold text-gray-700 hover:text-brand px-2 py-1.5 transition-colors cursor-pointer focus:outline-none"
            >
              Earn with Us
            </button>
            <a
              href={playStoreLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs font-bold hover:bg-brand transition-all shadow-md active:scale-95"
            >
              <FaGooglePlay className="text-sm" /> Get the App
            </a>
          </div>

          {/* Mobile Right Bar: App Pill + Menu Hamburger */}
          <div className="flex items-center gap-2 lg:hidden">
            <a
              href={playStoreLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-3 py-1.5 rounded-full text-[11px] font-bold shadow-sm"
            >
              <FaGooglePlay className="text-[10px]" /> App
            </a>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 text-gray-800 text-lg focus:outline-none cursor-pointer"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white border-b border-gray-200 px-4 py-4 space-y-3 shadow-xl"
            >
              <div className="grid grid-cols-2 gap-2 pb-3 border-b border-gray-100">
                {navMenuItems.map((item, idx) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={(e) => scrollToSection(e, item.href)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gray-50 hover:bg-brand/10 hover:text-brand active:bg-brand/20 active:scale-[0.98] text-xs font-semibold text-gray-800 transition-all text-left shadow-xs cursor-pointer ${
                      idx === navMenuItems.length - 1 ? 'col-span-2 sm:col-span-1' : ''
                    }`}
                  >
                    <span>{item.label}</span>
                    <FaChevronRight className="text-[10px] text-gray-400" />
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <a
                  href={playStoreLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-xl text-xs font-bold shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <FaGooglePlay className="text-sm" /> Download on Google Play Store
                </a>
                <button
                  type="button"
                  onClick={(e) => scrollToSection(e, '#partner')}
                  className="w-full text-center bg-brand/10 text-brand py-2.5 rounded-xl text-xs font-bold hover:bg-brand/20 active:scale-[0.98] transition-all cursor-pointer"
                >
                  🛠️ Register as a Service Partner
                </button>
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
        className="relative pt-20 sm:pt-32 pb-8 sm:pb-20 bg-gradient-to-b from-gray-50/80 via-white to-white overflow-hidden scroll-mt-24"
      >
        <div className="container mx-auto px-4 sm:px-8 max-w-7xl">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-14">
            {/* Left Column: Headlines & CTA */}
            <div className="flex-1 text-center lg:text-left">
              {/* Partner Banner Pill */}
              <button
                type="button"
                onClick={(e) => scrollToSection(e, '#partner')}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand/10 border border-brand/20 text-brand rounded-full mb-4 text-[11px] sm:text-xs font-bold hover:bg-brand/20 transition-colors cursor-pointer"
              >
                <span>🛠️ Skilled Technician?</span>
                <span className="underline">Register as Partner &rarr;</span>
              </button>

              <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-[1.2] mb-3 sm:mb-5">
                {config.hero?.title}
              </h1>

              <p className="text-xs sm:text-base text-gray-600 leading-relaxed mb-6 max-w-xl mx-auto lg:mx-0">
                {config.hero?.subtitle}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start items-center mb-6">
                <a
                  href={playStoreLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-gray-900 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold hover:bg-brand transition-all shadow-md active:scale-95 group"
                >
                  <FaGooglePlay className="text-lg group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <div className="text-[9px] text-gray-400 font-normal leading-none">FREE ON</div>
                    <div className="text-xs sm:text-sm font-bold leading-tight">Google Play Store</div>
                  </div>
                </a>

                <a
                  href={playStoreLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand text-white px-6 py-3 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold hover:bg-gray-900 transition-all shadow-md active:scale-95"
                >
                  {config.hero?.ctaUserText || 'Book on Play Store'} <FaArrowRight className="text-[10px]" />
                </a>
              </div>

              {/* Quick Trust Highlights */}
              <div className="inline-flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 text-[11px] sm:text-xs font-semibold text-gray-500">
                <span className="flex items-center gap-1">
                  <FaCheckCircle className="text-green-500 text-xs" /> Platform Warranty
                </span>
                <span className="flex items-center gap-1">
                  <FaCheckCircle className="text-green-500 text-xs" /> Verified Technicians
                </span>
                <span className="flex items-center gap-1">
                  <FaCheckCircle className="text-green-500 text-xs" /> Live GPS Tracking
                </span>
              </div>
            </div>

            {/* Right Column: Hero Visual with Warranty Shield */}
            <div className="w-full max-w-md sm:max-w-lg lg:max-w-none flex-1 relative">
              <div className="relative p-2 sm:p-3 bg-white rounded-3xl sm:rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden group">
                <div className="overflow-hidden rounded-2xl sm:rounded-[2.5rem] aspect-[16/10] sm:aspect-[16/11] relative bg-gray-100">
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
                <div className="absolute bottom-3 sm:bottom-6 left-3 sm:left-6 right-3 sm:right-6 bg-gray-900/90 backdrop-blur-md p-3 sm:p-5 rounded-xl sm:rounded-2xl text-white shadow-xl border border-white/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-8 h-8 sm:w-11 sm:h-11 bg-brand rounded-full flex items-center justify-center text-white shadow text-sm sm:text-lg">
                      <FaShieldAlt />
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">
                        Platform Guarantee
                      </p>
                      <p className="text-[11px] sm:text-xs md:text-sm font-bold">100% Certified Genuine Parts</p>
                    </div>
                  </div>
                  <span className="hidden sm:inline-block bg-white/10 text-brand text-xs font-bold px-2.5 py-1 rounded-full">
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
      <section className="py-6 sm:py-10 bg-gray-900 text-white relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-8 max-w-7xl">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className="text-center p-2 sm:p-3 border-r border-white/10 last:border-0 lg:border-r"
              >
                <div className="text-2xl sm:text-4xl font-extrabold mb-0.5 tracking-tight text-brand">
                  {stat.value}
                </div>
                <div className="text-gray-400 text-[11px] sm:text-xs font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. ABOUT US & TRUST PILLARS (COMPACT 2-COL MOBILE GRID) */}
      {/* ============================================================ */}
      <section id="about-us" className="py-10 sm:py-20 bg-white border-b border-gray-100 scroll-mt-20 sm:scroll-mt-24">
        <div className="container mx-auto px-4 sm:px-8 max-w-7xl">
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-14">
            <span className="text-brand font-bold text-[10px] sm:text-xs uppercase tracking-widest block mb-1">
              Who We Are
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-900 mb-2 sm:mb-3">
              {config.aboutUs?.title || 'About Help-U'}
            </h2>
            <p className="text-gray-600 text-xs sm:text-base leading-relaxed">
              {config.aboutUs?.description}
            </p>
          </div>

          {/* 4 Pillars Grid: 2 columns on mobile, 4 on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {pillars.map((pillar, idx) => (
              <div
                key={idx}
                className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gray-50 border border-gray-100 hover:border-brand/30 hover:shadow-md transition-all duration-300 group flex flex-col justify-between"
              >
                <div>
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-brand/10 text-brand flex items-center justify-center text-base sm:text-xl mb-3 sm:mb-4 group-hover:scale-105 group-hover:bg-brand group-hover:text-white transition-all">
                    {idx === 0 && <FaShieldAlt />}
                    {idx === 1 && <FaUserCheck />}
                    {idx === 2 && <FaMapMarkerAlt />}
                    {idx === 3 && <FaFileInvoiceDollar />}
                  </div>
                  <h3 className="text-xs sm:text-base font-bold text-gray-900 mb-1 leading-snug">
                    {pillar.title}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-gray-600 leading-relaxed line-clamp-3 sm:line-clamp-none">
                    {pillar.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. POPULAR SERVICES GRID (COMPACT TOUCH CAROUSEL) */}
      {/* ============================================================ */}
      <section id="services" className="py-10 sm:py-20 bg-gray-50/70 scroll-mt-20 sm:scroll-mt-24">
        <div className="container mx-auto px-4 sm:px-8 max-w-7xl">
          <div className="flex items-end justify-between mb-6 sm:mb-10">
            <div>
              <span className="text-brand font-bold text-[10px] sm:text-xs uppercase tracking-widest block mb-1">
                Our Catalog
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
                Explore Expert Services
              </h2>
              <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
                Tap any category to install or book via Google Play Store
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => scroll('left')}
                className="w-9 h-9 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-brand hover:border-brand transition-all shadow-sm"
                aria-label="Scroll left"
              >
                <FaChevronLeft className="text-xs" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="w-9 h-9 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-brand hover:border-brand transition-all shadow-sm"
                aria-label="Scroll right"
              >
                <FaChevronRight className="text-xs" />
              </button>
            </div>
          </div>

          {/* Carousel scroll: snap-x touch friendly */}
          <div
            ref={scrollRef}
            className="overflow-x-auto scrollbar-hide scroll-smooth py-2 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory"
          >
            <div className="flex gap-3 sm:gap-5 min-w-max">
              {categories.map((cat, idx) => {
                const iconSrc = toAssetUrl(cat.icon);
                return (
                  <a
                    key={cat.id || idx}
                    href={playStoreLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-36 sm:w-52 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-gray-100 hover:border-brand/40 hover:shadow-lg transition-all duration-300 flex flex-col items-center text-center group cursor-pointer snap-start"
                  >
                    <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gray-50 flex items-center justify-center p-2 sm:p-3 mb-3 group-hover:scale-105 transition-transform relative overflow-hidden">
                      {iconSrc ? (
                        <>
                          <img
                            src={iconSrc}
                            alt={cat.title}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.parentElement?.querySelector('.cat-fallback');
                              if (fallback) fallback.classList.remove('hidden');
                            }}
                          />
                          <div className="cat-fallback hidden items-center justify-center text-brand text-2xl">
                            <FaTools />
                          </div>
                        </>
                      ) : (
                        <FaTools className="text-2xl sm:text-3xl text-brand" />
                      )}
                    </div>
                    <h3 className="font-bold text-xs sm:text-sm text-gray-900 group-hover:text-brand transition-colors line-clamp-2 min-h-[32px] sm:min-h-[40px] flex items-center justify-center">
                      {cat.title}
                    </h3>
                    <span className="text-[10px] sm:text-[11px] text-brand mt-1.5 flex items-center gap-1 font-semibold group-hover:translate-x-0.5 transition-transform">
                      Play Store <FaArrowRight className="text-[8px]" />
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. HOW IT WORKS (TABBED: CUSTOMERS VS PARTNERS) */}
      {/* ============================================================ */}
      <section id="how-it-works" className="py-10 sm:py-20 bg-white border-b border-gray-100 scroll-mt-20 sm:scroll-mt-24">
        <div className="container mx-auto px-4 sm:px-8 max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
            <span className="text-brand font-bold text-[10px] sm:text-xs uppercase tracking-widest block mb-1">
              Simple Workflow
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-900 mb-4 sm:mb-5">
              How Help-U Works
            </h2>

            {/* Persona Switcher Tabs */}
            <div className="inline-flex rounded-full bg-gray-100 p-1 border border-gray-200">
              <button
                type="button"
                onClick={() => setHowItWorksTab('user')}
                className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-bold transition-all ${
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
                className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-bold transition-all ${
                  howItWorksTab === 'partner'
                    ? 'bg-brand text-white shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🛠️ For Partners
              </button>
            </div>
          </div>

          {/* Steps Timeline Grid: 2 columns on mobile, 4 on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {(howItWorksTab === 'user' ? userSteps : partnerSteps).map((st, idx) => (
              <div
                key={idx}
                className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gray-50 border border-gray-100 flex flex-col justify-between"
              >
                <div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center font-extrabold text-xs sm:text-sm mb-3 sm:mb-4 shadow-sm">
                    0{idx + 1}
                  </div>
                  <h3 className="text-xs sm:text-base font-bold text-gray-900 mb-1 leading-snug">
                    {st.title}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-gray-600 leading-relaxed line-clamp-3 sm:line-clamp-none">
                    {st.desc}
                  </p>
                </div>

                <div className="mt-3 pt-2 sm:mt-4 sm:pt-3 border-t border-gray-200/60 flex items-center gap-1 text-brand text-[10px] sm:text-xs font-bold">
                  <span>Step {idx + 1}</span>
                  <FaArrowRight className="text-[8px]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 7. APP SHOWCASE & PLAY STORE DOWNLOAD STRIP */}
      {/* ============================================================ */}
      <section id="why-us" className="py-10 sm:py-20 bg-gray-900 text-white overflow-hidden relative scroll-mt-20 sm:scroll-mt-24">
        <div className="container mx-auto px-4 sm:px-8 max-w-7xl">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
            <div className="max-w-xl text-center lg:text-left">
              <span className="text-brand font-bold text-[10px] sm:text-xs uppercase tracking-widest block mb-2">
                Mobile First Experience
              </span>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold mb-3 sm:mb-5 leading-tight">
                Quality Home Repair is <br />
                <span className="text-brand">Just a Tap Away.</span>
              </h2>
              <p className="text-gray-400 text-xs sm:text-base leading-relaxed mb-6">
                Download the official Help-U Android app for instant emergency bookings, live technician map tracking, digital receipts, and hassle-free wallet payments.
              </p>

              {/* Download badge & QR code */}
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 justify-center lg:justify-start">
                <a
                  href={playStoreLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-white text-gray-900 px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm hover:bg-brand hover:text-white transition-all shadow-xl active:scale-95"
                >
                  <FaGooglePlay className="text-xl text-gray-900 group-hover:text-white" />
                  <div className="text-left">
                    <div className="text-[9px] text-gray-500 leading-none">FREE ON</div>
                    <div className="text-xs sm:text-sm font-extrabold">Google Play Store</div>
                  </div>
                </a>

                {config.appLinks?.isQrCodeVisible !== false && (
                  <div className="hidden md:flex items-center gap-3 bg-white/5 border border-white/10 p-2.5 rounded-xl">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(
                        playStoreLink
                      )}`}
                      alt="Scan to Download Help-U"
                      className="w-12 h-12 rounded-lg bg-white p-1"
                    />
                    <div className="text-left text-xs">
                      <div className="font-bold text-white text-[11px]">Scan with Camera</div>
                      <div className="text-gray-400 text-[9px]">Direct Play Store install</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* App Screen Mockup: Compact on mobile */}
            <div className="w-full max-w-[220px] sm:max-w-xs relative mx-auto">
              <div className="p-2 sm:p-3 bg-gray-800 rounded-3xl sm:rounded-[3rem] border border-white/10 shadow-2xl">
                <div className="aspect-[9/16] rounded-2xl sm:rounded-[2.5rem] bg-gray-900 overflow-hidden relative">
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
      <section id="partner" className="py-10 sm:py-24 bg-gray-50 relative scroll-mt-20 sm:scroll-mt-24">
        <div className="container mx-auto px-4 sm:px-8 max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-14">
            <span className="text-brand font-bold text-[10px] sm:text-xs uppercase tracking-widest block mb-1">
              For Skilled Professionals
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-900 mb-2 sm:mb-3">
              {config.partnerSection?.title || 'Grow Your Business with Help-U'}
            </h2>
            <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
              {config.partnerSection?.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 items-start">
            {/* Left Column: Partner Perks */}
            <div className="lg:col-span-6 space-y-4 sm:space-y-6">
              <h3 className="text-lg sm:text-2xl font-bold text-gray-900">
                Why Top Technicians Choose Help-U
              </h3>
              {/* Compact 2-column grid on mobile */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                {perks.map((perk, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 sm:p-5 rounded-2xl bg-white border border-gray-100 shadow-sm"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center text-sm sm:text-lg mb-2 sm:mb-3">
                      {idx === 0 && <FaTools />}
                      {idx === 1 && <FaWallet />}
                      {idx === 2 && <FaBoxes />}
                      {idx === 3 && <FaClock />}
                    </div>
                    <h4 className="font-bold text-xs sm:text-sm text-gray-900 mb-0.5 leading-snug">
                      {perk.title}
                    </h4>
                    <p className="text-[10px] sm:text-xs text-gray-600 leading-relaxed line-clamp-3 sm:line-clamp-none">
                      {perk.desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* Partner App prompt */}
              <div className="p-4 sm:p-5 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-gray-900">Have a Partner Account?</h4>
                  <p className="text-[10px] sm:text-xs text-gray-600">Access your partner job dashboard.</p>
                </div>
                <Link
                  to="/worker/login"
                  className="px-3.5 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-brand transition-colors whitespace-nowrap"
                >
                  Partner Login
                </Link>
              </div>
            </div>

            {/* Right Column: Live Partner Registration Lead Form */}
            <div className="lg:col-span-6">
              <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-gray-200 shadow-lg">
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-lg sm:text-2xl font-extrabold text-gray-900 mb-1">
                    Register as a Service Partner
                  </h3>
                  <p className="text-[11px] sm:text-xs text-gray-500">
                    Takes 2 minutes. Free registration with zero joining charges.
                  </p>
                </div>

                {partnerSubmitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 text-center bg-green-50 rounded-2xl border border-green-200"
                  >
                    <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
                      <FaCheckCircle />
                    </div>
                    <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-1">Registration Received!</h4>
                    <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                      Thank you for joining Help-U. Our onboarding manager will call your phone number within 24 hours to activate your account.
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
                  <form onSubmit={handlePartnerSubmit} className="space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Rahul Sharma"
                          value={partnerForm.name}
                          onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                          className="w-full rounded-xl border border-gray-300 px-3.5 py-2 sm:py-2.5 text-xs text-gray-900 focus:border-brand focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">
                          Mobile Number *
                        </label>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          placeholder="10-digit phone number"
                          value={partnerForm.phone}
                          onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                          className="w-full rounded-xl border border-gray-300 px-3.5 py-2 sm:py-2.5 text-xs text-gray-900 focus:border-brand focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">
                          Primary Trade / Skill *
                        </label>
                        <select
                          value={partnerForm.trade}
                          onChange={(e) => setPartnerForm({ ...partnerForm, trade: e.target.value })}
                          className="w-full rounded-xl border border-gray-300 px-3.5 py-2 sm:py-2.5 text-xs text-gray-900 focus:border-brand focus:outline-none bg-white"
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
                        <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">
                          City *
                        </label>
                        <input
                          type="text"
                          required
                          value={partnerForm.city}
                          onChange={(e) => setPartnerForm({ ...partnerForm, city: e.target.value })}
                          placeholder="Indore"
                          className="w-full rounded-xl border border-gray-300 px-3.5 py-2 sm:py-2.5 text-xs text-gray-900 focus:border-brand focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">
                          Experience Level
                        </label>
                        <select
                          value={partnerForm.experience}
                          onChange={(e) =>
                            setPartnerForm({ ...partnerForm, experience: e.target.value })
                          }
                          className="w-full rounded-xl border border-gray-300 px-3.5 py-2 sm:py-2.5 text-xs text-gray-900 focus:border-brand focus:outline-none bg-white"
                        >
                          <option value="1-2 years">1 – 2 years</option>
                          <option value="3-5 years">3 – 5 years</option>
                          <option value="5+ years">5+ years (Expert)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">
                          Email (Optional)
                        </label>
                        <input
                          type="email"
                          placeholder="partner@example.com"
                          value={partnerForm.email}
                          onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })}
                          className="w-full rounded-xl border border-gray-300 px-3.5 py-2 sm:py-2.5 text-xs text-gray-900 focus:border-brand focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={partnerSubmitting}
                      className="w-full py-3 sm:py-3.5 bg-[#163B66] text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-gray-900 transition-all shadow-md active:scale-95 disabled:opacity-50 mt-1"
                    >
                      {partnerSubmitting ? 'Submitting...' : 'Register as Partner &rarr;'}
                    </button>
                    <p className="text-[10px] text-gray-400 text-center">
                      By registering, you agree to our Partner Guidelines.
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
      <section id="faq" className="py-10 sm:py-20 bg-white border-b border-gray-100 scroll-mt-20 sm:scroll-mt-24">
        <div className="container mx-auto px-4 sm:px-8 max-w-3xl">
          <div className="text-center mb-8 sm:mb-12">
            <span className="text-brand font-bold text-[10px] sm:text-xs uppercase tracking-widest block mb-1">
              Got Questions?
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-900 mb-4 sm:mb-5">
              Frequently Asked Questions
            </h2>

            {/* FAQ Tabs */}
            <div className="inline-flex rounded-full bg-gray-100 p-1 border border-gray-200">
              <button
                type="button"
                onClick={() => setFaqTab('user')}
                className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-bold transition-all ${
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
                className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-bold transition-all ${
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
          <div className="space-y-2.5 sm:space-y-3">
            {filteredFaqs.length === 0 && (
              <p className="text-center text-xs text-gray-500">No questions here yet.</p>
            )}
            {filteredFaqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl sm:rounded-2xl border border-gray-200 bg-white transition-all overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-3 focus:outline-none"
                  >
                    <span className="font-bold text-xs sm:text-sm text-gray-900 leading-snug">
                      {faq.question}
                    </span>
                    <span
                      className={`w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180 bg-brand text-white' : ''
                      }`}
                    >
                      <FaChevronDown className="text-[10px]" />
                    </span>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 sm:px-5 pb-4 sm:pb-5 text-[11px] sm:text-xs text-gray-600 leading-relaxed border-t border-gray-50 pt-2"
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
      {/* 10. CONTACT US & DIRECT SUPPORT CHANNELS (COMPACT 2-COL MOBILE) */}
      {/* ============================================================ */}
      <section id="contact" className="py-10 sm:py-20 bg-gray-50/70 scroll-mt-20 sm:scroll-mt-24">
        <div className="container mx-auto px-4 sm:px-8 max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
            <span className="text-brand font-bold text-[10px] sm:text-xs uppercase tracking-widest block mb-1">
              We're Here For You
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-900 mb-1 sm:mb-2">Contact Us</h2>
            <p className="text-gray-600 text-xs sm:text-sm">
              Reach our customer care or message us directly anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
            {/* Contact Details Cards: 2-column compact grid on mobile */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-2.5 sm:gap-4">
              {config.contact?.supportPhone && (
              <a
                href={`tel:${config.contact.supportPhone}`}
                className="p-3.5 sm:p-5 rounded-2xl bg-white border border-gray-200 flex flex-col justify-between hover:border-brand/40 transition-colors"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm sm:text-base mb-2">
                  <FaPhoneAlt />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-gray-900 mb-0.5">Helpline</h4>
                  <p className="text-[10px] sm:text-xs text-brand font-bold truncate">
                    {config.contact.supportPhone}
                  </p>
                </div>
              </a>
              )}

              {config.contact?.supportWhatsapp && (
              <a
                href={`https://wa.me/91${config.contact.supportWhatsapp.replace(
                  /\D/g,
                  ''
                ).slice(-10)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 sm:p-5 rounded-2xl bg-white border border-gray-200 flex flex-col justify-between hover:border-green-400 transition-colors"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center text-base sm:text-lg mb-2">
                  <FaWhatsapp />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-gray-900 mb-0.5">WhatsApp</h4>
                  <p className="text-[10px] sm:text-xs text-green-600 font-bold">Chat Now &rarr;</p>
                </div>
              </a>
              )}

              {config.contact?.supportEmail && (
              <a
                href={`mailto:${config.contact.supportEmail}`}
                className="p-3.5 sm:p-5 rounded-2xl bg-white border border-gray-200 flex flex-col justify-between hover:border-brand/40 transition-colors"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm sm:text-base mb-2">
                  <FaEnvelope />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-gray-900 mb-0.5">Email</h4>
                  <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                    {config.contact.supportEmail}
                  </p>
                </div>
              </a>
              )}

              {config.contact?.workingHours && (
              <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-gray-200 flex flex-col justify-between">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-sm sm:text-base mb-2">
                  <FaClock />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-gray-900 mb-0.5">Hours</h4>
                  <p className="text-[10px] sm:text-xs text-gray-500 leading-tight">{config.contact.workingHours}</p>
                </div>
              </div>
              )}
            </div>

            {/* Quick Contact Form */}
            <div className="lg:col-span-7 bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-gray-200 shadow-sm">
              <h3 className="text-base sm:text-xl font-extrabold text-gray-900 mb-1">Send Us a Direct Message</h3>
              <p className="text-[11px] sm:text-xs text-gray-500 mb-4">
                Have a question? We typically reply within a few hours.
              </p>

              <form onSubmit={handleContactSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Anand Jain"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-brand focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Phone / Email *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Phone or email"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Message *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="How can we help you?"
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-brand focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={contactSubmitting}
                  className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-brand transition-all shadow-md active:scale-95 disabled:opacity-50"
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
      <footer className="py-10 sm:py-16 bg-gray-950 text-white border-t border-gray-800">
        <div className="container mx-auto px-4 sm:px-8 max-w-7xl">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-10 mb-8 sm:mb-12">
            {/* Brand Col */}
            <div className="col-span-2 space-y-3">
              <Link to="/Home" className="flex items-center gap-2">
                <img
                  src="/helpu-logo.png"
                  alt="Help-U Logo"
                  className="h-8 w-auto"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <span className="font-extrabold text-xl tracking-tight text-white">
                  Help<span className="text-brand">-U</span>
                </span>
              </Link>
              <p className="text-gray-400 text-xs leading-relaxed max-w-sm">
                Enterprise on-demand home & technical services marketplace across Indore. Certified genuine parts, transparent doorstep billing, and background-checked technicians.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-brand mb-3">
                Explore
              </h4>
              <ul className="space-y-1.5 text-xs text-gray-400">
                <li>
                  <button
                    type="button"
                    onClick={(e) => scrollToSection(e, '#about-us')}
                    className="hover:text-white transition-colors cursor-pointer text-left"
                  >
                    About Us
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={(e) => scrollToSection(e, '#services')}
                    className="hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Services
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={(e) => scrollToSection(e, '#how-it-works')}
                    className="hover:text-white transition-colors cursor-pointer text-left"
                  >
                    How It Works
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={(e) => scrollToSection(e, '#partner')}
                    className="hover:text-white transition-colors cursor-pointer text-left"
                  >
                    For Partners
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={(e) => scrollToSection(e, '#faq')}
                    className="hover:text-white transition-colors cursor-pointer text-left"
                  >
                    FAQs
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={(e) => scrollToSection(e, '#contact')}
                    className="hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Contact
                  </button>
                </li>
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-brand mb-3">
                Legal & Safety
              </h4>
              <ul className="space-y-1.5 text-xs text-gray-400">
                <li><Link to="/user/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/user/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/user/cancellation-policy" className="hover:text-white transition-colors">Refunds & Cancel</Link></li>
                <li><Link to="/worker/login" className="hover:text-white transition-colors">Partner Portal</Link></li>
              </ul>
            </div>

            {/* City & Contact Info */}
            <div className="col-span-2 sm:col-span-1">
              <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-brand mb-3">
                Location
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed mb-2">
                {config.contact?.companyAddress}
              </p>
              {config.contact?.supportPhone && (
                <p className="text-xs text-gray-400">
                  Helpline: <a href={`tel:${config.contact.supportPhone}`} className="text-white hover:underline">{config.contact.supportPhone}</a>
                </p>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] sm:text-[11px] text-gray-500 text-center sm:text-left">
            <p>© {new Date().getFullYear()} Help-U Technologies. All rights reserved.</p>
            <p className="flex items-center justify-center gap-1">
              Built in Indore 🇮🇳 • Speed, Safety & Quality
            </p>
          </div>
        </div>
      </footer>

      {/* ============================================================ */}
      {/* 12. HIGH-CONVERTING MOBILE STICKY BOTTOM DOWNLOAD BAR */}
      {/* ============================================================ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-2.5 flex items-center justify-between sm:hidden shadow-2xl">
        <div className="flex items-center gap-2.5">
          <img
            src="/helpu-logo.png"
            alt="Help-U"
            className="w-8 h-8 rounded-lg object-contain bg-gray-50 p-0.5 border border-gray-200"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <div>
            <div className="font-extrabold text-xs text-gray-900 leading-none">Help-U Home Services</div>
            <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
              <span className="flex text-amber-500 text-[9px]"><FaStar /><FaStar /><FaStar /><FaStar /></span>
              <span>4.8 Rating</span>
            </div>
          </div>
        </div>

        <a
          href={playStoreLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md active:scale-95"
        >
          <FaGooglePlay className="text-[11px]" /> Install App
        </a>
      </div>
    </div>
  );
};

export default LandingPage;
