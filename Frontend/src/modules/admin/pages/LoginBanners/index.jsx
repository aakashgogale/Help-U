import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiCopy,
  FiGift,
  FiZap,
  FiPercent,
  FiShield,
  FiStar,
  FiTrendingUp,
  FiAward,
  FiClock,
  FiUploadCloud,
  FiSmartphone,
  FiRefreshCw,
  FiArrowUp,
  FiArrowDown,
  FiEye,
  FiTag,
  FiX,
  FiVideo,
  FiVolume2,
  FiVolumeX,
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import { toast } from 'react-hot-toast';
import { loginBannerService } from '../../services/loginBannerService';
import { serviceService } from '../../../../services/catalogService';
import Logo from '../../../../components/common/Logo';

// Gradient presets mapping
const GRADIENTS = [
  { id: 'navy', label: 'Navy Blue (Signature)', class: 'from-[#163B66] via-[#1E4D82] to-[#0F2B48] text-white', color: '#163B66' },
  { id: 'emerald', label: 'Emerald Green (Offers)', class: 'from-[#065F46] via-[#059669] to-[#047857] text-white', color: '#059669' },
  { id: 'amber', label: 'Amber Orange (Flash Deals)', class: 'from-[#92400E] via-[#D97706] to-[#B45309] text-white', color: '#D97706' },
  { id: 'purple', label: 'Royal Purple (Partner Perks)', class: 'from-[#5B21B6] via-[#7C3AED] to-[#4C1D95] text-white', color: '#7C3AED' },
  { id: 'rose', label: 'Rose Red (Festive & Hot)', class: 'from-[#9F1239] via-[#E11D48] to-[#881337] text-white', color: '#E11D48' },
  { id: 'blue', label: 'Electric Blue (Trust)', class: 'from-[#1E40AF] via-[#2563EB] to-[#1D4ED8] text-white', color: '#2563EB' },
  { id: 'dark', label: 'Slate Dark (Modern)', class: 'from-[#0F172A] via-[#1E293B] to-[#334155] text-white', color: '#1E293B' },
];

const ICONS = [
  { id: 'sparkles', label: 'Sparkles', icon: HiSparkles },
  { id: 'gift', label: 'Gift', icon: FiGift },
  { id: 'zap', label: 'Zap / Fast', icon: FiZap },
  { id: 'percent', label: 'Discount', icon: FiPercent },
  { id: 'shield', label: 'Shield / Safe', icon: FiShield },
  { id: 'star', label: 'Star / Top Rated', icon: FiStar },
  { id: 'trending', label: 'Trending / Growth', icon: FiTrendingUp },
  { id: 'award', label: 'Award', icon: FiAward },
  { id: 'clock', label: 'Clock / Quick', icon: FiClock },
];

const renderIcon = (iconName, className = 'w-4 h-4') => {
  const match = ICONS.find((i) => i.id === iconName);
  const Comp = match ? match.icon : HiSparkles;
  return <Comp className={className} />;
};

const isVideoBanner = (banner) => {
  if (!banner) return false;
  if (banner.mediaType === 'video' || Boolean(banner.videoUrl)) return true;
  return /\.(mp4|webm|mov|ogg|m4v)($|\?)/i.test(banner.imageUrl || '') || (banner.imageUrl || '').includes('/video/upload/');
};

const EMPTY_FORM = {
  app: 'user',
  title: '',
  subtitle: '',
  badge: '',
  mediaType: 'gradient', // 'gradient' | 'image' | 'video'
  imageUrl: '',
  videoUrl: '',
  icon: 'sparkles',
  gradient: 'navy',
  offerCode: '',
  linkUrl: '',
  order: 0,
  isActive: true,
};

const LoginBannersAdmin = () => {
  const [banners, setBanners] = useState([]);
  const [config, setConfig] = useState({
    isUserLoginBannersEnabled: true,
    isPartnerLoginBannersEnabled: true
  });
  const [activeTab, setActiveTab] = useState('user'); // 'all' | 'user' | 'partner'
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewApp, setPreviewApp] = useState('user'); // for mobile preview
  const [previewIndex, setPreviewIndex] = useState(0);
  const [simulatedKeyboard, setSimulatedKeyboard] = useState(false); // interactive testing for keyboard
  const [previewMuted, setPreviewMuted] = useState(true);

  // Fetch banner master config
  const fetchConfig = useCallback(async () => {
    try {
      const res = await loginBannerService.getConfig();
      if (res?.config) {
        setConfig(res.config);
      }
    } catch (err) {
      console.warn('Failed to load banner master config');
    }
  }, []);

  // Fetch all banners
  const fetchBanners = useCallback(async () => {
    setIsLoading(true);
    try {
      const [bannersRes] = await Promise.all([
        loginBannerService.getAll(),
        fetchConfig()
      ]);
      if (bannersRes?.banners) {
        setBanners(bannersRes.banners);
      }
    } catch (err) {
      toast.error('Failed to load login banners');
    } finally {
      setIsLoading(false);
    }
  }, [fetchConfig]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  // Master disable/enable toggle
  const handleToggleMaster = async (key) => {
    const nextVal = !config[key];
    const prev = config;
    setConfig((p) => ({ ...p, [key]: nextVal }));
    try {
      await loginBannerService.updateConfig({ [key]: nextVal });
      toast.success(
        `${key === 'isUserLoginBannersEnabled' ? 'User App' : 'Partner App'} banners ${
          nextVal ? 'enabled' : 'disabled'
        }`
      );
    } catch (err) {
      setConfig(prev);
      toast.error('Failed to update toggle');
    }
  };

  // Filtered banners
  const filteredBanners = useMemo(() => {
    if (activeTab === 'all') return banners;
    return banners.filter((b) => b.app === activeTab || b.app === 'both');
  }, [banners, activeTab]);

  // Preview banners based on previewApp
  const previewBanners = useMemo(() => {
    return banners.filter((b) => b.isActive && (b.app === previewApp || b.app === 'both'));
  }, [banners, previewApp]);

  // Auto-slide preview
  useEffect(() => {
    if (previewBanners.length <= 1) {
      setPreviewIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setPreviewIndex((prev) => (prev + 1) % previewBanners.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [previewBanners.length]);

  // Open modal for create
  const handleOpenCreate = () => {
    setEditingBanner(null);
    setFormData({
      ...EMPTY_FORM,
      app: activeTab === 'partner' ? 'partner' : 'user',
      order: filteredBanners.length,
    });
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      app: banner.app || 'user',
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      badge: banner.badge || '',
      mediaType: banner.mediaType || (banner.videoUrl ? 'video' : banner.imageUrl ? 'image' : 'gradient'),
      imageUrl: banner.imageUrl || '',
      videoUrl: banner.videoUrl || '',
      icon: banner.icon || 'sparkles',
      gradient: banner.gradient || 'navy',
      offerCode: banner.offerCode || '',
      linkUrl: banner.linkUrl || '',
      order: banner.order ?? 0,
      isActive: banner.isActive !== false,
    });
    setIsModalOpen(true);
  };

  // Handle media upload (image or short video)
  const handleMediaUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    setUploadProgress(15);
    const isVideo = file.type.startsWith('video/');
    try {
      const res = await serviceService.uploadImage(file, 'banners', (progress) => {
        setUploadProgress(progress);
      });
      if (res?.imageUrl) {
        if (isVideo) {
          setFormData((prev) => ({
            ...prev,
            videoUrl: res.imageUrl,
            mediaType: 'video'
          }));
          toast.success('Short video uploaded successfully!');
        } else {
          setFormData((prev) => ({
            ...prev,
            imageUrl: res.imageUrl,
            mediaType: 'image'
          }));
          toast.success('Banner image uploaded!');
        }
      } else {
        toast.error('Upload failed. Check file size/format.');
      }
    } catch (err) {
      toast.error('Media upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Save banner (create or update)
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Please enter a banner title');
      return;
    }

    try {
      if (editingBanner) {
        await loginBannerService.update(editingBanner._id, formData);
        toast.success('Login banner updated successfully');
      } else {
        await loginBannerService.create(formData);
        toast.success('Login banner created successfully');
      }
      setIsModalOpen(false);
      fetchBanners();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save banner');
    }
  };

  // Toggle active status
  const handleToggleStatus = async (banner) => {
    try {
      await loginBannerService.toggleStatus(banner._id);
      setBanners((prev) =>
        prev.map((b) => (b._id === banner._id ? { ...b, isActive: !b.isActive } : b))
      );
      toast.success(`Banner ${!banner.isActive ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.error('Failed to change status');
    }
  };

  // Delete banner
  const handleDelete = async (banner) => {
    if (!window.confirm(`Delete banner "${banner.title}"?`)) return;
    try {
      await loginBannerService.delete(banner._id);
      setBanners((prev) => prev.filter((b) => b._id !== banner._id));
      toast.success('Banner deleted');
    } catch (err) {
      toast.error('Failed to delete banner');
    }
  };

  // Reorder up/down
  const handleMoveOrder = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredBanners.length) return;

    const list = [...filteredBanners];
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);

    const reorderedIds = list.map((b) => b._id);
    try {
      await loginBannerService.reorder(reorderedIds);
      fetchBanners();
      toast.success('Order updated');
    } catch (err) {
      toast.error('Failed to reorder');
    }
  };

  // Seed default banners
  const handleSeedDefaults = async () => {
    if (!window.confirm('Add recommended starter banners for User and Partner apps?')) return;
    try {
      const res = await loginBannerService.seedDefaults('all');
      if (res?.banners) {
        setBanners(res.banners);
      }
      toast.success(res.message || 'Starter banners added!');
    } catch (err) {
      toast.error('Failed to seed banners');
    }
  };

  // Compute banner gradient style helper
  const getGradientClass = (gradientId) => {
    const match = GRADIENTS.find((g) => g.id === gradientId);
    return match ? match.class : GRADIENTS[0].class;
  };

  // Active current banner in mobile preview
  const activePreviewBanner = previewBanners[previewIndex] || previewBanners[0];
  const isCurrentAppBannerEnabled =
    previewApp === 'user' ? config.isUserLoginBannersEnabled : config.isPartnerLoginBannersEnabled;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-[#163B66] text-white rounded-xl shadow-md">
              <FiSmartphone className="w-5 h-5" />
            </span>
            Login Screen Banners & Offers
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Control large floating banners, short videos, and promotional offers displayed above the login form.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={fetchBanners}
            disabled={isLoading}
            className="p-2.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
            title="Refresh Banners"
          >
            <FiRefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleSeedDefaults}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all border border-slate-200 active:scale-95"
            title="Seed curated banners if empty"
          >
            <HiSparkles className="w-4 h-4 text-amber-500" />
            Seed Recommended
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#163B66] hover:bg-[#0F2B48] text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            <FiPlus className="w-4 h-4" />
            Add New Banner / Video
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Banners</span>
          <span className="text-2xl font-black text-slate-800 mt-1">{banners.length}</span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active Banners</span>
          <span className="text-2xl font-black text-emerald-600 mt-1">
            {banners.filter((b) => b.isActive).length}
          </span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <span className="text-xs font-semibold text-[#163B66] uppercase tracking-wider">User App</span>
          <span className="text-2xl font-black text-[#163B66] mt-1">
            {banners.filter((b) => b.app === 'user' || b.app === 'both').length}
          </span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Partner App</span>
          <span className="text-2xl font-black text-purple-600 mt-1">
            {banners.filter((b) => b.app === 'partner' || b.app === 'both').length}
          </span>
        </div>
      </div>

      {/* Master Enable/Disable Control Switches */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* User App Master Switch */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            config.isUserLoginBannersEnabled
              ? 'bg-blue-50/60 border-blue-200 shadow-sm'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`w-3 h-3 rounded-full ${
                  config.isUserLoginBannersEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-800">User App Login Banners</h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      config.isUserLoginBannersEnabled
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {config.isUserLoginBannersEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {config.isUserLoginBannersEnabled
                    ? 'Floating banners and videos are active on customer login'
                    : 'Banners are turned OFF completely on customer login'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleMaster('isUserLoginBannersEnabled')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.isUserLoginBannersEnabled ? 'bg-[#163B66]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  config.isUserLoginBannersEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Partner App Master Switch */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            config.isPartnerLoginBannersEnabled
              ? 'bg-purple-50/60 border-purple-200 shadow-sm'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`w-3 h-3 rounded-full ${
                  config.isPartnerLoginBannersEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-800">Partner App Login Banners</h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      config.isPartnerLoginBannersEnabled
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {config.isPartnerLoginBannersEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {config.isPartnerLoginBannersEnabled
                    ? 'Moving partner banners are active on worker login'
                    : 'Banners are turned OFF completely on worker login'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleMaster('isPartnerLoginBannersEnabled')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.isPartnerLoginBannersEnabled ? 'bg-purple-700' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  config.isPartnerLoginBannersEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Banners Management + Right Live Mobile Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tabs & Banner Cards (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* App Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 w-full sm:w-auto inline-flex">
            <button
              type="button"
              onClick={() => {
                setActiveTab('user');
                setPreviewApp('user');
              }}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'user'
                  ? 'bg-white text-[#163B66] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              👤 User App Banners ({banners.filter((b) => b.app === 'user' || b.app === 'both').length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('partner');
                setPreviewApp('partner');
              }}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'partner'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🤝 Partner App Banners ({banners.filter((b) => b.app === 'partner' || b.app === 'both').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({banners.length})
            </button>
          </div>

          {/* Banner Cards List */}
          {isLoading ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
              <div className="inline-block w-8 h-8 border-3 border-[#163B66] border-t-transparent rounded-full animate-spin" />
              <p className="mt-3 text-sm text-slate-500">Loading banners...</p>
            </div>
          ) : filteredBanners.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-3xl border border-dashed border-slate-300">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <FiTag className="w-6 h-6" />
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-800">No Banners Found</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                No login banners configured for {activeTab === 'user' ? 'the User App' : activeTab === 'partner' ? 'the Partner App' : 'this filter'}.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleSeedDefaults}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Seed Recommended Banners
                </button>
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#163B66] hover:bg-[#0F2B48] rounded-xl transition-all"
                >
                  + Add First Banner
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBanners.map((banner, index) => {
                const gradientClass = getGradientClass(banner.gradient);
                const isVideo = isVideoBanner(banner);
                return (
                  <motion.div
                    key={banner._id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`bg-white rounded-2xl border ${
                      banner.isActive ? 'border-slate-200 shadow-sm' : 'border-slate-200/60 opacity-60 bg-slate-50/50'
                    } p-4 transition-all hover:shadow-md`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Mini Card Preview */}
                      <div className="flex-1 min-w-0">
                        {/* Mini live banner */}
                        <div
                          className={`relative rounded-xl overflow-hidden shadow-sm p-3 border border-white/20 ${
                            isVideo
                              ? 'bg-slate-950 text-white min-h-[84px]'
                              : banner.imageUrl
                              ? 'bg-slate-900 text-white min-h-[84px]'
                              : `bg-gradient-to-r ${gradientClass}`
                          }`}
                        >
                          {isVideo ? (
                            <video
                              src={banner.videoUrl || banner.imageUrl}
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="absolute inset-0 w-full h-full object-cover opacity-75"
                            />
                          ) : banner.imageUrl ? (
                            <img
                              src={banner.imageUrl}
                              alt={banner.title}
                              className="absolute inset-0 w-full h-full object-cover opacity-80"
                            />
                          ) : null}

                          <div className="relative z-10">
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              {banner.badge && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider">
                                  {renderIcon(banner.icon, 'w-2.5 h-2.5 text-amber-300')}
                                  {banner.badge}
                                </span>
                              )}
                              {banner.offerCode && (
                                <span className="px-2 py-0.5 rounded-full bg-white text-slate-900 text-[10px] font-black tracking-wide shadow-sm">
                                  CODE: {banner.offerCode}
                                </span>
                              )}
                            </div>
                            <h4 className="text-white text-xs sm:text-sm font-bold line-clamp-1 drop-shadow-sm">
                              {banner.title}
                            </h4>
                            {banner.subtitle && (
                              <p className="text-white/85 text-[11px] line-clamp-1 drop-shadow-sm">
                                {banner.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Meta tags */}
                        <div className="mt-2 flex items-center gap-2 flex-wrap text-xs text-slate-500">
                          <span
                            className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                              banner.app === 'user'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : banner.app === 'partner'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}
                          >
                            {banner.app === 'user' ? 'User App' : banner.app === 'partner' ? 'Partner App' : 'Both Apps'}
                          </span>
                          <span className="text-slate-400">Order: #{banner.order}</span>
                          {isVideo ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 font-bold rounded-md border border-rose-200 text-[11px]">
                              <FiVideo className="w-3 h-3" /> Short Video
                            </span>
                          ) : banner.imageUrl ? (
                            <span className="text-emerald-600 font-medium text-[11px]">Image Banner</span>
                          ) : (
                            <span className="text-slate-500 capitalize text-[11px]">{banner.gradient} Theme</span>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                        {/* Status Toggle */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-500">
                            {banner.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(banner)}
                            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                              banner.isActive ? 'bg-[#163B66]' : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                banner.isActive ? 'translate-x-5' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Reorder and Edit Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMoveOrder(index, 'up')}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Move Up"
                          >
                            <FiArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === filteredBanners.length - 1}
                            onClick={() => handleMoveOrder(index, 'down')}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Move Down"
                          >
                            <FiArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(banner)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Banner"
                          >
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(banner)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Banner"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Live Mobile Screen Simulator (5 Cols) */}
        <div className="lg:col-span-5 sticky top-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-4 sm:p-5">
            {/* Header of simulator */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <FiEye className="w-4 h-4 text-[#163B66]" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Live Mobile Simulator
                </span>
              </div>

              {/* App selector & Keyboard Toggle */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Keyboard Simulator Toggle */}
                <button
                  type="button"
                  onClick={() => setSimulatedKeyboard((prev) => !prev)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all border ${
                    simulatedKeyboard
                      ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-sm'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                  title="Test how the UI stays intact when mobile keyboard opens"
                >
                  <span>⌨️ Keyboard {simulatedKeyboard ? 'Open' : 'Closed'}</span>
                </button>

                <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewApp('user')}
                    className={`px-2 py-1 rounded-lg font-bold transition-all ${
                      previewApp === 'user' ? 'bg-[#163B66] text-white shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    User
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewApp('partner')}
                    className={`px-2 py-1 rounded-lg font-bold transition-all ${
                      previewApp === 'partner' ? 'bg-purple-700 text-white shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Partner
                  </button>
                </div>
              </div>
            </div>

            {/* Simulated Phone Frame */}
            <div className="w-full max-w-[320px] mx-auto bg-white rounded-[2.5rem] border-[7px] border-slate-800 shadow-2xl overflow-hidden relative">
              {/* Phone Speaker & Camera Notch */}
              <div className="h-5 bg-slate-800 flex justify-center items-center">
                <div className="w-16 h-2.5 bg-slate-900 rounded-full" />
              </div>

              {/* Status bar mock */}
              <div className="px-5 py-1.5 flex items-center justify-between text-[10px] font-bold text-slate-400">
                <span>9:41</span>
                <span className="flex items-center gap-1">5G 100%</span>
              </div>

              {/* Login Screen Content inside Phone */}
              <div className="p-4 flex flex-col justify-between min-h-[520px] relative bg-white">
                {/* Ambient glow in phone */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#163B66]/[0.03] rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 text-center">
                  {/* 1. Help U Logo */}
                  <div className={`flex justify-center transition-all duration-300 ${simulatedKeyboard ? 'mb-1' : 'mb-2'}`}>
                    <Logo className={`w-auto object-contain transition-all duration-300 ${simulatedKeyboard ? 'h-9' : 'h-12'}`} />
                  </div>

                  {/* 2. Floating Banners & Offers Carousel */}
                  {!isCurrentAppBannerEnabled ? (
                    <div className="my-2 py-1.5 px-2 rounded-xl bg-slate-100 border border-dashed border-slate-300 text-[10px] text-slate-500 font-medium">
                      🚫 Banners are currently <span className="font-bold text-red-500">Disabled</span> for {previewApp === 'user' ? 'User' : 'Partner'} App
                    </div>
                  ) : activePreviewBanner ? (
                    <div className="my-2 text-left transition-all duration-300">
                      <div
                        className={`rounded-2xl shadow-md border border-white/20 transition-all duration-500 overflow-hidden relative ${
                          isVideoBanner(activePreviewBanner)
                            ? 'bg-slate-950 h-32 sm:h-36'
                            : activePreviewBanner.imageUrl
                            ? 'bg-slate-900 h-32 sm:h-36'
                            : `bg-gradient-to-r p-3 ${getGradientClass(activePreviewBanner.gradient)} min-h-[96px]`
                        }`}
                      >
                        {isVideoBanner(activePreviewBanner) ? (
                          <>
                            <video
                              src={activePreviewBanner.videoUrl || activePreviewBanner.imageUrl}
                              autoPlay
                              loop
                              muted={previewMuted}
                              playsInline
                              webkit-playsinline="true"
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewMuted((p) => !p);
                              }}
                              className="absolute top-2 right-2 z-30 p-1 rounded-full bg-black/60 text-white shadow-sm"
                              title={previewMuted ? 'Unmute' : 'Muted'}
                            >
                              {previewMuted ? <FiVolumeX className="w-3 h-3" /> : <FiVolume2 className="w-3 h-3 text-amber-300" />}
                            </button>
                          </>
                        ) : activePreviewBanner.imageUrl ? (
                          <img
                            src={activePreviewBanner.imageUrl}
                            alt="preview"
                            className="absolute inset-0 w-full h-full object-cover opacity-90"
                          />
                        ) : null}

                        {/* Overlay text */}
                        <div
                          className={`relative z-10 flex flex-col justify-end ${
                            isVideoBanner(activePreviewBanner) || activePreviewBanner.imageUrl
                              ? 'absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-3'
                              : 'h-full justify-between'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            {activePreviewBanner.badge && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/25 text-[9px] font-bold text-white uppercase tracking-wider backdrop-blur-sm">
                                {renderIcon(activePreviewBanner.icon, 'w-2.5 h-2.5 text-amber-300')}
                                {activePreviewBanner.badge}
                              </span>
                            )}
                            {activePreviewBanner.offerCode && (
                              <span className="px-2 py-0.5 rounded-full bg-white text-slate-900 text-[9px] font-extrabold shadow-sm">
                                {activePreviewBanner.offerCode}
                              </span>
                            )}
                          </div>
                          <div>
                            <h4 className="text-white text-xs font-bold leading-tight line-clamp-1 drop-shadow-sm">
                              {activePreviewBanner.title}
                            </h4>
                            {activePreviewBanner.subtitle && (
                              <p className="text-white/80 text-[10px] leading-tight line-clamp-1 mt-0.5 drop-shadow-sm">
                                {activePreviewBanner.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Dots inside preview */}
                        {previewBanners.length > 1 && (
                          <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1 z-20 pointer-events-none">
                            {previewBanners.map((_, i) => (
                              <span
                                key={i}
                                className={`h-1 rounded-full transition-all ${
                                  i === previewIndex ? 'w-3.5 bg-white shadow' : 'w-1 bg-white/40'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="my-2 p-2.5 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-[11px] text-slate-400">
                      No active banners for {previewApp === 'user' ? 'User' : 'Partner'} app
                    </div>
                  )}

                  {/* 3. Heading (Below floating banners) */}
                  <h3 className={`font-extrabold text-slate-900 tracking-tight transition-all ${
                    simulatedKeyboard ? 'text-sm mt-1' : 'text-base mt-2'
                  }`}>
                    {previewApp === 'user' ? 'Sign in to account' : 'Service Partner Sign In'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {previewApp === 'user' ? 'Enter your mobile number to get started' : 'Manage your services and bookings'}
                  </p>
                </div>

                {/* 4. Mock Phone Card */}
                <div className={`relative z-10 bg-white rounded-2xl border border-slate-100 shadow-md p-3.5 transition-all ${
                  simulatedKeyboard ? 'my-1' : 'my-2'
                }`}>
                  <div className="text-left">
                    <span className="text-[11px] font-semibold text-slate-600 block mb-1">Mobile Number</span>
                    <div className="flex items-center px-2.5 py-2 rounded-xl bg-slate-50 border border-[#163B66] text-xs">
                      <span className="font-bold text-slate-700 pr-2 border-r border-slate-200 mr-2">+91</span>
                      <span className="text-slate-900 font-medium">98765 43210</span>
                      <span className="ml-1 w-0.5 h-3.5 bg-[#163B66] animate-pulse" />
                    </div>
                  </div>
                  <div className="mt-2.5 py-2 bg-[#163B66] text-white rounded-xl text-center text-xs font-bold shadow-sm">
                    Get OTP &rarr;
                  </div>
                </div>

                {/* 5. Mock Virtual Keyboard (shown when simulated keyboard is ON) */}
                {simulatedKeyboard ? (
                  <div className="bg-slate-200/90 backdrop-blur-md p-1.5 rounded-t-2xl border-t border-slate-300 space-y-1 animate-slide-in-bottom">
                    <div className="flex justify-center gap-1">
                      {['1','2','3','4','5','6','7','8','9','0'].map((k) => (
                        <span key={k} className="flex-1 py-1 bg-white rounded shadow-sm text-center text-[9px] font-bold text-slate-700">{k}</span>
                      ))}
                    </div>
                    <div className="flex justify-center gap-1">
                      {['q','w','e','r','t','y','u','i','o','p'].map((k) => (
                        <span key={k} className="flex-1 py-1 bg-white rounded shadow-sm text-center text-[9px] font-medium text-slate-600 uppercase">{k}</span>
                      ))}
                    </div>
                    <div className="flex justify-center gap-1 px-2">
                      {['a','s','d','f','g','h','j','k','l'].map((k) => (
                        <span key={k} className="flex-1 py-1 bg-white rounded shadow-sm text-center text-[9px] font-medium text-slate-600 uppercase">{k}</span>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* 5. Mock Footer (hidden when keyboard is open) */
                  <div className="text-center text-[9px] text-slate-400 pb-2">
                    &copy; {new Date().getFullYear()} Help U. All rights reserved.
                  </div>
                )}
              </div>

              {/* Bottom Home Indicator */}
              <div className="h-4 bg-slate-800 flex justify-center items-center">
                <div className="w-24 h-1 bg-white/60 rounded-full" />
              </div>
            </div>

            <div className="mt-3 text-center">
              <span className="text-[11px] text-slate-400 font-medium">
                Toggle "Keyboard Open" above to test how UI remains intact.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 relative"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                    {editingBanner ? 'Edit Login Banner / Video' : 'Create Login Banner / Video'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Add short promotional videos, high-res images, or styled offer cards.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSave} className="space-y-4">
                {/* Target App */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Application
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'user', label: '👤 User App' },
                      { id: 'partner', label: '🤝 Partner App' },
                      { id: 'both', label: '🌐 Both Apps' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, app: opt.id }))}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                          formData.app === opt.id
                            ? 'bg-[#163B66] text-white border-[#163B66] shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Banner Media Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Banner Content Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'gradient', label: '✨ Offer Card' },
                      { id: 'image', label: '🖼️ Image Banner' },
                      { id: 'video', label: '🎬 Short Video' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, mediaType: m.id }))}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                          formData.mediaType === m.id
                            ? 'bg-[#163B66] text-white border-[#163B66] shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Banner Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Banner Title / Headline <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Flat ₹150 OFF on First Service or Earn ₹50,000/mo"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#163B66] focus:ring-2 focus:ring-[#163B66]/10 outline-none transition-all"
                  />
                </div>

                {/* Subtitle / Offer Details */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subtitle / Offer Details
                  </label>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => setFormData((p) => ({ ...p, subtitle: e.target.value }))}
                    placeholder="e.g. Use code FIRST150 at checkout"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#163B66] focus:ring-2 focus:ring-[#163B66]/10 outline-none transition-all"
                  />
                </div>

                {/* Badge & Offer Code Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Badge Tag
                    </label>
                    <input
                      type="text"
                      value={formData.badge}
                      onChange={(e) => setFormData((p) => ({ ...p, badge: e.target.value }))}
                      placeholder="e.g. SPECIAL OFFER"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#163B66] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Promo / Coupon Code
                    </label>
                    <input
                      type="text"
                      value={formData.offerCode}
                      onChange={(e) => setFormData((p) => ({ ...p, offerCode: e.target.value.toUpperCase() }))}
                      placeholder="e.g. FIRST150"
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#163B66] outline-none transition-all uppercase"
                    />
                  </div>
                </div>

                {/* If Video: Video upload & URL */}
                {formData.mediaType === 'video' && (
                  <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <FiVideo className="w-4 h-4 text-rose-500" />
                        Short Video (MP4 / WebM / Cloudinary)
                      </label>
                      {formData.videoUrl && (
                        <button
                          type="button"
                          onClick={() => setFormData((p) => ({ ...p, videoUrl: '' }))}
                          className="text-[11px] text-red-500 hover:underline"
                        >
                          Remove Video
                        </button>
                      )}
                    </div>

                    {formData.videoUrl ? (
                      <div className="relative rounded-2xl overflow-hidden border border-slate-200 h-36 bg-black flex items-center justify-center">
                        <video
                          src={formData.videoUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-2xl cursor-pointer bg-white transition-colors">
                        <FiUploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                        <span className="text-xs font-semibold text-slate-700">
                          {isUploading ? `Uploading Video (${uploadProgress}%)...` : 'Click to upload Short Video'}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">MP4, WebM, MOV (recommended &lt; 20MB)</span>
                        <input
                          type="file"
                          accept="video/*"
                          disabled={isUploading}
                          onChange={(e) => handleMediaUpload(e.target.files?.[0])}
                          className="hidden"
                        />
                      </label>
                    )}

                    <div>
                      <span className="text-[11px] text-slate-500 block mb-1">Or paste Direct Video URL:</span>
                      <input
                        type="url"
                        value={formData.videoUrl}
                        onChange={(e) => setFormData((p) => ({ ...p, videoUrl: e.target.value, mediaType: 'video' }))}
                        placeholder="https://res.cloudinary.com/.../video.mp4"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-[#163B66] outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* If Image: Image upload & URL */}
                {formData.mediaType === 'image' && (
                  <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">
                        Banner Image
                      </label>
                      {formData.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setFormData((p) => ({ ...p, imageUrl: '' }))}
                          className="text-[11px] text-red-500 hover:underline"
                        >
                          Remove Image
                        </button>
                      )}
                    </div>

                    {formData.imageUrl ? (
                      <div className="relative rounded-2xl overflow-hidden border border-slate-200 h-32 bg-slate-900">
                        <img
                          src={formData.imageUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-2xl cursor-pointer bg-white transition-colors">
                        <FiUploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                        <span className="text-xs font-semibold text-slate-700">
                          {isUploading ? 'Uploading Image...' : 'Click to upload banner image'}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WebP (recommended 16:9 ratio)</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isUploading}
                          onChange={(e) => handleMediaUpload(e.target.files?.[0])}
                          className="hidden"
                        />
                      </label>
                    )}

                    <div>
                      <span className="text-[11px] text-slate-500 block mb-1">Or paste Direct Image URL:</span>
                      <input
                        type="url"
                        value={formData.imageUrl}
                        onChange={(e) => setFormData((p) => ({ ...p, imageUrl: e.target.value, mediaType: 'image' }))}
                        placeholder="https://.../banner.jpg"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-[#163B66] outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* If Gradient Offer Card: Icon & Theme */}
                {formData.mediaType === 'gradient' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Badge Icon
                      </label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {ICONS.map((item) => {
                          const IconComp = item.icon;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setFormData((p) => ({ ...p, icon: item.id }))}
                              className={`p-2 rounded-xl border flex items-center gap-1 text-xs font-medium transition-all ${
                                formData.icon === item.id
                                  ? 'bg-[#163B66] text-white border-[#163B66] shadow-sm'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                              title={item.label}
                            >
                              <IconComp className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Color Theme Gradient
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {GRADIENTS.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setFormData((p) => ({ ...p, gradient: g.id }))}
                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                              formData.gradient === g.id
                                ? 'ring-2 ring-[#163B66] border-[#163B66] shadow-sm'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <span
                              className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                              style={{ backgroundColor: g.color }}
                            />
                            <span className="text-xs font-medium text-slate-800 line-clamp-1">{g.label.split(' ')[0]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Order & Active Status */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Display Order
                    </label>
                    <input
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData((p) => ({ ...p, order: Number(e.target.value) }))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none"
                    />
                  </div>
                  <div className="flex flex-col justify-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                        className="w-4 h-4 text-[#163B66] rounded focus:ring-[#163B66]"
                      />
                      <span className="text-xs font-bold text-slate-700">Active on Login</span>
                    </label>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-5 py-2 text-xs font-bold text-white bg-[#163B66] hover:bg-[#0F2B48] rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    {editingBanner ? 'Save Changes' : 'Create Banner / Video'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoginBannersAdmin;
