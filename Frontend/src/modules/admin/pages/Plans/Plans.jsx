import React, { useState, useEffect } from 'react';
import { getPlans, createPlan, updatePlan, deletePlan } from '../../services/planService';
import { categoryService, brandService, serviceService } from '../../../../services/catalogService';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiX,
  FiPackage,
  FiTool,
  FiClock,
  FiStar,
  FiZap,
  FiCalendar,
  FiShield,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiTag,
  FiAlertCircle
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const Plans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const initialForm = {
    name: 'Silver',
    isCustomName: false,
    customName: '',
    price: '',
    validityMonths: 1,
    duration: '1 Month',
    tagline: '',
    description: '',
    isActive: true,
    isPopular: false,
    highlights: [],
    freeCategories: [],
    freeServices: [],
    bonusServices: []
  };

  const [formData, setFormData] = useState(initialForm);
  const [newHighlight, setNewHighlight] = useState('');
  const [benefitsTab, setBenefitsTab] = useState('categories'); // 'categories' | 'services' | 'bonus'

  const PLAN_PRESETS = ['Silver', 'Gold', 'Diamond', 'Platinum'];
  const MONTH_PRESETS = [
    { label: '1 Month (Monthly)', months: 1, display: '1 Month' },
    { label: '3 Months (Quarterly)', months: 3, display: '3 Months' },
    { label: '6 Months (Half-Yearly)', months: 6, display: '6 Months' },
    { label: '12 Months (1 Year)', months: 12, display: '1 Year' },
    { label: '24 Months (2 Years)', months: 24, display: '2 Years' }
  ];

  // Catalog State
  const [categories, setCategories] = useState([]);
  const [brandsList, setBrandsList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedService, setSelectedService] = useState('');

  const getCardStyle = (name) => {
    const lower = (name || '').toLowerCase();

    if (lower.includes('platinum')) {
      return {
        container: 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white border-slate-700 shadow-xl ring-1 ring-slate-700/60',
        badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
        text: 'text-white',
        subtext: 'text-slate-400',
        price: 'text-white',
        accentBadge: 'bg-white/10 text-white border border-white/15',
        check: 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/30',
        footer: 'bg-slate-950/80 border-slate-800'
      };
    }
    if (lower.includes('diamond')) {
      return {
        container: 'bg-gradient-to-b from-indigo-950 via-slate-900 to-purple-950 text-white border-indigo-500/30 shadow-xl ring-1 ring-indigo-500/20',
        badge: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
        text: 'text-white',
        subtext: 'text-indigo-200/80',
        price: 'text-white',
        accentBadge: 'bg-indigo-500/15 text-indigo-200 border border-indigo-400/20',
        check: 'text-indigo-300 bg-indigo-950/60 border border-indigo-500/30',
        footer: 'bg-indigo-950/50 border-indigo-900/50'
      };
    }
    if (lower.includes('gold')) {
      return {
        container: 'bg-gradient-to-b from-amber-50 to-yellow-50/70 border-amber-200/80 text-amber-950 shadow-md ring-1 ring-amber-200',
        badge: 'bg-amber-100 text-amber-800 border border-amber-300',
        text: 'text-amber-950',
        subtext: 'text-amber-700',
        price: 'text-amber-950',
        accentBadge: 'bg-amber-100/80 text-amber-900 border border-amber-200',
        check: 'text-amber-700 bg-amber-100 border border-amber-200',
        footer: 'bg-amber-100/50 border-amber-200/70'
      };
    }
    if (lower.includes('silver')) {
      return {
        container: 'bg-gradient-to-b from-slate-50 to-gray-100 border-slate-200 text-slate-800 shadow-md ring-1 ring-slate-200',
        badge: 'bg-slate-200 text-slate-800 border border-slate-300',
        text: 'text-slate-900',
        subtext: 'text-slate-600',
        price: 'text-slate-950',
        accentBadge: 'bg-slate-200/80 text-slate-700 border border-slate-300',
        check: 'text-slate-700 bg-slate-200 border border-slate-300',
        footer: 'bg-slate-100 border-slate-200'
      };
    }
    // Custom / Default
    return {
      container: 'bg-white border-teal-200 text-slate-800 shadow-md ring-1 ring-teal-100',
      badge: 'bg-teal-50 text-teal-700 border border-teal-200',
      text: 'text-slate-900',
      subtext: 'text-slate-600',
      price: 'text-slate-950',
      accentBadge: 'bg-teal-50 text-teal-700 border border-teal-100',
      check: 'text-teal-600 bg-teal-50 border border-teal-200',
      footer: 'bg-slate-50 border-slate-200'
    };
  };

  const formatDurationDisplay = (plan) => {
    if (plan.duration && String(plan.duration).trim()) {
      const d = String(plan.duration).trim();
      if (/months?|years?|days?/i.test(d)) return d;
      return `${d} ${Number(d) === 1 ? 'Month' : 'Months'}`;
    }
    if (plan.validityMonths) {
      return `${plan.validityMonths} ${plan.validityMonths === 1 ? 'Month' : 'Months'}`;
    }
    return '1 Month';
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [plansRes, catsRes, brandsRes, servsRes] = await Promise.all([
        getPlans(),
        categoryService.getAll(),
        brandService.getAll(),
        serviceService.getAll({ status: 'active' })
      ]);

      if (plansRes.success) setPlans(plansRes.data);

      const categoriesData = catsRes.categories || catsRes.data || (Array.isArray(catsRes) ? catsRes : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);

      const brandsData = brandsRes.brands || brandsRes.data || (Array.isArray(brandsRes) ? brandsRes : []);
      setBrandsList(Array.isArray(brandsData) ? brandsData : []);

      const servicesData = servsRes.services || servsRes.data || (Array.isArray(servsRes) ? servsRes : []);
      setServicesList(Array.isArray(servicesData) ? servicesData : []);

    } catch (error) {
      console.error('fetchInitialData error', error);
      toast.error('Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await getPlans();
      if (res.success) setPlans(res.data);
    } catch (error) {
      console.error('Refresh plans failed', error);
    }
  };

  // Filter services when category changes
  useEffect(() => {
    if (!selectedCategory) {
      setFilteredServices([]);
      return;
    }
    const filtered = servicesList.filter(s => {
      if (!s) return false;
      const catId = s.categoryId?._id || s.categoryId || s.id;
      return String(catId) === String(selectedCategory);
    });
    setFilteredServices(filtered);
    setSelectedService('');
  }, [selectedCategory, servicesList]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleMonthPresetClick = (preset) => {
    setFormData(prev => ({
      ...prev,
      validityMonths: preset.months,
      duration: preset.display
    }));
  };

  const handleAddHighlight = () => {
    const trimmed = newHighlight.trim();
    if (!trimmed) return;
    if (formData.highlights.includes(trimmed)) {
      toast.error('Highlight already exists');
      return;
    }
    setFormData(prev => ({
      ...prev,
      highlights: [...prev.highlights, trimmed]
    }));
    setNewHighlight('');
  };

  const handleRemoveHighlight = (index) => {
    setFormData(prev => ({
      ...prev,
      highlights: prev.highlights.filter((_, i) => i !== index)
    }));
  };

  const handleToggleActive = async (plan, e) => {
    e.stopPropagation();
    try {
      const updatedStatus = !plan.isActive;
      await updatePlan(plan._id, { isActive: updatedStatus });
      toast.success(`Plan ${updatedStatus ? 'activated' : 'deactivated'} successfully`);
      setPlans(prev => prev.map(p => p._id === plan._id ? { ...p, isActive: updatedStatus } : p));
    } catch (error) {
      console.error(error);
      toast.error('Failed to toggle status');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalName = (formData.isCustomName ? formData.customName : formData.name).trim();

    if (!finalName) {
      toast.error('Please specify a plan name');
      return;
    }
    if (formData.price === '' || isNaN(formData.price) || Number(formData.price) < 0) {
      toast.error('Please specify a valid price (₹)');
      return;
    }

    const months = Number(formData.validityMonths) > 0 ? Number(formData.validityMonths) : 1;
    const finalDuration = formData.duration && formData.duration.trim()
      ? formData.duration.trim()
      : `${months} ${months === 1 ? 'Month' : 'Months'}`;

    const payload = {
      name: finalName,
      price: Number(formData.price),
      validityMonths: months,
      validityDays: months * 30,
      duration: finalDuration,
      tagline: (formData.tagline || '').trim(),
      description: (formData.description || '').trim(),
      isActive: Boolean(formData.isActive),
      isPopular: Boolean(formData.isPopular),
      highlights: (formData.highlights || []).filter(h => h && h.trim()),
      freeCategories: formData.freeCategories.map(c => String(c?._id || c)),
      freeServices: formData.freeServices.map(s => String(s?._id || s)),
      bonusServices: formData.bonusServices.map(bs => ({
        categoryId: String(bs.categoryId?._id || bs.categoryId),
        serviceId: String(bs.serviceId?._id || bs.serviceId)
      }))
    };

    try {
      setSaving(true);
      if (currentPlan) {
        await updatePlan(currentPlan._id, payload);
        toast.success('Plan updated successfully');
      } else {
        await createPlan(payload);
        toast.success('Plan created successfully');
      }
      setIsModalOpen(false);
      fetchPlans();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Error saving plan');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (plan) => {
    setCurrentPlan(plan);
    const isStandardName = PLAN_PRESETS.includes(plan.name);

    const vMonths = plan.validityMonths
      || (plan.validityDays ? Math.round(plan.validityDays / 30) : null)
      || (plan.duration ? parseInt(plan.duration) : null)
      || 1;

    setFormData({
      name: isStandardName ? plan.name : 'Custom',
      isCustomName: !isStandardName,
      customName: isStandardName ? '' : plan.name,
      price: plan.price !== undefined ? plan.price : '',
      validityMonths: vMonths,
      duration: plan.duration || `${vMonths} ${vMonths === 1 ? 'Month' : 'Months'}`,
      tagline: plan.tagline || '',
      description: plan.description || '',
      isActive: plan.isActive !== undefined ? plan.isActive : true,
      isPopular: Boolean(plan.isPopular),
      highlights: Array.isArray(plan.highlights) ? plan.highlights : [],
      freeCategories: (plan.freeCategories || []).map(c => c._id || c),
      freeServices: (plan.freeServices || []).map(s => s._id || s),
      bonusServices: (plan.bonusServices || []).map(bs => ({
        categoryId: bs.categoryId?._id || bs.categoryId,
        serviceId: bs.serviceId?._id || bs.serviceId
      }))
    });
    setNewHighlight('');
    setIsModalOpen(true);
    setSelectedCategory('');
    setSelectedService('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subscription plan? Users currently subscribed will continue until expiry, but new purchases will be prevented.')) return;
    try {
      await deletePlan(id);
      toast.success('Plan deleted successfully');
      fetchPlans();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete plan');
    }
  };

  const openCreateModal = () => {
    setCurrentPlan(null);
    setFormData({
      ...initialForm,
      highlights: ['Priority Service Booking', 'Zero Inspection Fees', 'Verified Expert Technicians']
    });
    setNewHighlight('');
    setIsModalOpen(true);
    setSelectedCategory('');
    setSelectedService('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header and Quick Stats */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FiShield className="text-primary-600 w-7 h-7" />
            Membership Plans Management
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Configure subscription tiers, validity duration (months), pricing, and benefit coverages.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-md shadow-primary-600/20 active:scale-95 transition-all flex items-center gap-2 self-start md:self-auto shrink-0"
        >
          <FiPlus className="w-5 h-5" />
          Add New Plan
        </button>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            {plans.length}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Plans</p>
            <p className="text-lg font-black text-slate-900">{plans.length} Configured</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            {plans.filter(p => p.isActive).length}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Plans</p>
            <p className="text-lg font-black text-emerald-600">{plans.filter(p => p.isActive).length} Live for Users</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <FiClock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Durations</p>
            <p className="text-lg font-black text-amber-700">Monthly to Annual</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <FiZap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Coverage</p>
            <p className="text-lg font-black text-purple-700">Unlimited & Free</p>
          </div>
        </div>
      </div>

      {/* Plan Cards Grid */}
      {loading ? (
        <div className="flex justify-center p-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map(plan => {
            const style = getCardStyle(plan.name);
            const durationLabel = formatDurationDisplay(plan);
            const validityMonthsCount = plan.validityMonths || (plan.validityDays ? Math.round(plan.validityDays / 30) : 1);

            return (
              <div
                key={plan._id}
                className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden hover:shadow-lg ${style.container}`}
              >
                <div className="p-6">
                  {/* Top Bar: Name, Badges, Active Toggle */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-2xl font-black tracking-tight ${style.text}`}>{plan.name}</h3>
                        {plan.isPopular && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-sm flex items-center gap-1">
                            <FiStar className="w-2.5 h-2.5 fill-white" /> Popular
                          </span>
                        )}
                      </div>
                      {plan.tagline && (
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${style.accentBadge}`}>
                          {plan.tagline}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleToggleActive(plan, e)}
                      title={plan.isActive ? 'Click to Pause Plan' : 'Click to Activate Plan'}
                      className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                        plan.isActive
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
                          : 'bg-slate-500 text-slate-100 hover:bg-slate-600'
                      }`}
                    >
                      {plan.isActive ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                          Active
                        </>
                      ) : (
                        <>
                          <FiEyeOff className="w-3 h-3" />
                          Paused
                        </>
                      )}
                    </button>
                  </div>

                  {/* Price and Validity Months Display */}
                  <div className="mb-6 pb-4 border-b border-current/10">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-black ${style.price}`}>₹{plan.price}</span>
                      <span className={`text-sm font-bold opacity-75`}>/ {durationLabel}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-semibold opacity-60 flex items-center gap-1">
                        <FiCalendar className="w-3.5 h-3.5" />
                        Validity: {validityMonthsCount} {validityMonthsCount === 1 ? 'Month' : 'Months'} (~{validityMonthsCount * 30} days)
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {plan.description && (
                    <p className={`text-xs font-medium leading-relaxed mb-6 opacity-80 italic`}>
                      "{plan.description}"
                    </p>
                  )}

                  {/* Benefits Summary Section */}
                  <div className="space-y-4 mb-6">
                    {/* Unlimited Categories */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider opacity-70 flex items-center gap-1">
                          <FiZap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          Unlimited Categories ({plan.freeCategories?.length || 0})
                        </span>
                      </div>
                      {plan.freeCategories && plan.freeCategories.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {plan.freeCategories.map((catRef, idx) => {
                            const catId = String(catRef?._id || catRef);
                            const cat = categories.find(c => String(c.id || c._id) === catId);
                            const displayTitle = cat ? cat.title : (catRef?.title || 'Category');
                            return (
                              <span
                                key={`cat-b-${idx}`}
                                className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                              >
                                {displayTitle} (100% Free)
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] opacity-40 italic">No unlimited categories configured</p>
                      )}
                    </div>

                    {/* Specific Free Services */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider opacity-70 flex items-center gap-1">
                          <FiCheckCircle className="w-3.5 h-3.5 text-rose-400" />
                          Included Free Services ({plan.freeServices?.length || 0})
                        </span>
                      </div>
                      {plan.freeServices && plan.freeServices.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {(() => {
                            const uniqueNames = new Set();
                            return plan.freeServices.map((svcRef, idx) => {
                              const svcId = String(svcRef?._id || svcRef);
                              const svc = servicesList.find(s => String(s.id || s._id) === svcId) || svcRef;
                              if (!svc || !svc.title) return null;
                              if (uniqueNames.has(svc.title.trim().toLowerCase())) return null;
                              uniqueNames.add(svc.title.trim().toLowerCase());

                              return (
                                <span
                                  key={`svc-b-${idx}`}
                                  className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/20"
                                >
                                  {svc.title} (All Brands)
                                </span>
                              );
                            });
                          })()}
                        </div>
                      ) : (
                        <p className="text-[11px] opacity-40 italic">No specific free services configured</p>
                      )}
                    </div>

                    {/* Bonus / Inherited Services */}
                    {plan.bonusServices && plan.bonusServices.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider opacity-70 flex items-center gap-1">
                            <FiStar className="w-3.5 h-3.5 text-amber-400" />
                            Bonus / Inherited Tier Benefits ({plan.bonusServices.length})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(() => {
                            const seen = new Set();
                            return plan.bonusServices.map((bs, idx) => {
                              const svc = bs.serviceId;
                              if (!svc || !svc.title) return null;
                              const key = svc.title.trim().toLowerCase();
                              if (seen.has(key)) return null;
                              seen.add(key);

                              return (
                                <span
                                  key={`bs-b-${idx}`}
                                  className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20"
                                >
                                  {svc.title}
                                </span>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Highlights */}
                    {plan.highlights && plan.highlights.length > 0 && (
                      <div className="pt-2 border-t border-current/10">
                        <span className="text-[10px] font-black uppercase tracking-wider opacity-70 block mb-1.5">
                          Key Selling Points:
                        </span>
                        <ul className="space-y-1">
                          {plan.highlights.map((hl, hIdx) => (
                            <li key={hIdx} className="text-xs font-semibold flex items-center gap-2 opacity-90">
                              <FiCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="truncate">{hl}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className={`px-6 py-4 flex items-center justify-between border-t ${style.footer}`}>
                  <span className="text-[11px] font-semibold opacity-60">
                    Updated {new Date(plan.updatedAt || plan.createdAt || Date.now()).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(plan)}
                      className="px-3 py-1.5 bg-blue-500/15 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <FiEdit2 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(plan._id)}
                      className="p-2 bg-red-500/15 text-red-600 hover:bg-red-600 hover:text-white rounded-lg text-xs font-bold transition-all"
                      title="Delete Plan"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {plans.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
              <FiStar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-800">No Subscription Plans Found</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                Get started by creating your first subscription tier (e.g. Silver, Gold, Platinum).
              </p>
              <button
                onClick={openCreateModal}
                className="mt-4 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-primary-700 transition-all inline-flex items-center gap-2"
              >
                <FiPlus className="w-4 h-4" /> Create First Plan
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in duration-200 my-8 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/70 sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  {currentPlan ? `Edit ${currentPlan.name} Plan` : 'Create New Subscription Plan'}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Configure plan pricing, validity months, marketing highlights, and customer free coverages.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="bg-white p-2 rounded-full text-gray-400 hover:text-gray-700 shadow-sm border border-gray-200 transition-all hover:rotate-90"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-8 flex-1">
              {/* SECTION 1: Identity & Pricing */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                  <span className="w-6 h-6 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center text-xs font-black">1</span>
                  <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Plan Name & Pricing</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Preset or Custom Name */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 uppercase">Plan Name Tier</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {PLAN_PRESETS.map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              name: preset,
                              isCustomName: false
                            }));
                          }}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black tracking-wider transition-all ${
                            !formData.isCustomName && formData.name === preset
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            name: 'Custom',
                            isCustomName: true
                          }));
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black tracking-wider transition-all ${
                          formData.isCustomName
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        + Custom Name
                      </button>
                    </div>

                    {formData.isCustomName && (
                      <input
                        type="text"
                        name="customName"
                        value={formData.customName}
                        onChange={handleInputChange}
                        placeholder="e.g. Family Annual Saver, Help-U VIP"
                        required={formData.isCustomName}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-bold text-sm"
                      />
                    )}
                  </div>

                  {/* Price */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">Subscription Price (₹)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-2.5 text-gray-500 font-black text-sm">₹</span>
                      <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        required
                        min="0"
                        placeholder="1499"
                        className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-black text-slate-900 text-base"
                      />
                    </div>
                  </div>
                </div>

                {/* Status switches */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <div>
                      <p className="text-xs font-extrabold text-slate-900">Active (Visible to Customers)</p>
                      <p className="text-[10px] text-slate-500">Enable this to allow users to purchase or view this plan</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="isPopular"
                      checked={formData.isPopular}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400"
                    />
                    <div>
                      <p className="text-xs font-extrabold text-slate-900">Mark as "Popular / Best Value"</p>
                      <p className="text-[10px] text-slate-500">Highlights this plan with a golden badge on the user app</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* SECTION 2: Validity & Duration ("kitne month admin khud kr paye") */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-black">2</span>
                    <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Plan Duration & Validity (Months)</h3>
                  </div>
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                    Admin Managed
                  </span>
                </div>

                {/* Quick Preset Buttons */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600">Quick Month Presets:</label>
                  <div className="flex flex-wrap gap-2">
                    {MONTH_PRESETS.map((m) => (
                      <button
                        key={m.months}
                        type="button"
                        onClick={() => handleMonthPresetClick(m)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                          Number(formData.validityMonths) === m.months
                            ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-400/40'
                            : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Number of Months */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Number of Months <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="validityMonths"
                        value={formData.validityMonths}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setFormData(prev => ({
                            ...prev,
                            validityMonths: val,
                            duration: val === 12 ? '1 Year' : `${val} ${val === 1 ? 'Month' : 'Months'}`
                          }));
                        }}
                        min="1"
                        max="120"
                        required
                        placeholder="1"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-black text-slate-900 text-base"
                      />
                      <span className="absolute right-4 top-2.5 text-xs font-bold text-slate-400">Months</span>
                    </div>
                  </div>

                  {/* Duration Display Label */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Custom Display Label (User App)
                    </label>
                    <input
                      type="text"
                      name="duration"
                      value={formData.duration}
                      onChange={handleInputChange}
                      placeholder="e.g. 1 Month, 12 Months, 1 Year"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-bold text-slate-900 text-sm"
                    />
                  </div>
                </div>

                {/* Calculation Info Banner */}
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/80 flex items-center gap-3 text-xs text-amber-900 font-semibold">
                  <FiClock className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <span>Calculated Coverage Period: </span>
                    <strong className="font-extrabold underline">{Number(formData.validityMonths) || 1} Months</strong>
                    <span> (~{(Number(formData.validityMonths) || 1) * 30} Days). Users subscribing to this plan will have active benefits for exactly this duration.</span>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Tagline, Description & Key Selling Points */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                  <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black">3</span>
                  <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Marketing & Description</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">Tagline</label>
                    <input
                      type="text"
                      name="tagline"
                      value={formData.tagline}
                      onChange={handleInputChange}
                      placeholder="e.g. Any 3 services free in this product"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-medium text-sm"
                    />
                    <p className="text-[10px] text-slate-400">Short badge displayed under the plan title.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">Detailed Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Describe what the user gets with this membership plan..."
                      rows={3}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-medium text-sm"
                    />
                  </div>
                </div>

                {/* Highlights List Builder */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-slate-700 uppercase">Key Selling Points / Bullet Highlights</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newHighlight}
                      onChange={(e) => setNewHighlight(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddHighlight();
                        }
                      }}
                      placeholder="e.g. Free 2-hour emergency visits, Flat 20% off spare parts"
                      className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleAddHighlight}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shrink-0"
                    >
                      + Add Bullet
                    </button>
                  </div>

                  {formData.highlights.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {formData.highlights.map((hl, i) => (
                        <span
                          key={i}
                          className="pl-3 pr-2 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-200"
                        >
                          <FiCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{hl}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveHighlight(i)}
                            className="p-0.5 hover:bg-slate-200 text-slate-400 hover:text-red-500 rounded transition-colors"
                          >
                            <FiX className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 4: Benefits Builder (Structured Tabs) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-black">4</span>
                    <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Plan Benefits & Coverages</h3>
                  </div>
                </div>

                {/* Benefits Navigation Tabs */}
                <div className="flex border-b border-gray-200 gap-2">
                  <button
                    type="button"
                    onClick={() => setBenefitsTab('categories')}
                    className={`pb-2.5 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                      benefitsTab === 'categories'
                        ? 'border-emerald-600 text-emerald-700'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <FiZap className="w-3.5 h-3.5" />
                    1. Unlimited Categories ({formData.freeCategories.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setBenefitsTab('services')}
                    className={`pb-2.5 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                      benefitsTab === 'services'
                        ? 'border-rose-600 text-rose-700'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <FiCheckCircle className="w-3.5 h-3.5" />
                    2. Specific Free Services ({formData.freeServices.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setBenefitsTab('bonus')}
                    className={`pb-2.5 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                      benefitsTab === 'bonus'
                        ? 'border-amber-600 text-amber-700'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <FiStar className="w-3.5 h-3.5" />
                    3. Bonus / Tier Inherited ({formData.bonusServices.length})
                  </button>
                </div>

                {/* TAB 1: Unlimited Categories */}
                {benefitsTab === 'categories' && (
                  <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 space-y-4">
                    <div>
                      <h4 className="text-sm font-extrabold text-emerald-950">Unlimited Service Categories</h4>
                      <p className="text-xs text-emerald-700">
                        When you add a category here, all services under that category become 100% free with unlimited visits for plan members.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="flex-1 px-4 py-2.5 bg-white border border-emerald-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">Select Category to cover 100% free...</option>
                        {categories.map(cat => (
                          <option key={cat.id || cat._id} value={cat.id || cat._id}>{cat.title}</option>
                        ))}
                      </select>

                      <button
                        type="button"
                        disabled={!selectedCategory}
                        onClick={() => {
                          if (!selectedCategory) return;
                          if (formData.freeCategories.some(c => String(c._id || c) === String(selectedCategory))) {
                            toast.error('Category is already included in free list');
                            return;
                          }
                          setFormData(prev => ({
                            ...prev,
                            freeCategories: [...prev.freeCategories, selectedCategory]
                          }));
                          toast.success('Unlimited Category added');
                          setSelectedCategory('');
                        }}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black disabled:opacity-50 transition-all shrink-0"
                      >
                        + Add Category
                      </button>
                    </div>

                    {/* Active Categories Pills */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {formData.freeCategories.map((catId, idx) => {
                        const targetId = String(catId?._id || catId);
                        const cat = categories.find(c => String(c.id || c._id) === targetId);
                        const displayTitle = cat ? cat.title : (catId?.title || 'Category');
                        return (
                          <span
                            key={idx}
                            className="pl-3 pr-2 py-1.5 bg-white text-emerald-900 border border-emerald-200 rounded-xl text-xs font-black shadow-sm flex items-center gap-2"
                          >
                            <FiPackage className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{displayTitle} (Unlimited Free)</span>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  freeCategories: prev.freeCategories.filter(id => String(id?._id || id) !== targetId)
                                }));
                              }}
                              className="p-1 hover:bg-emerald-100 rounded text-emerald-500 hover:text-red-500 transition-colors"
                            >
                              <FiX className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        );
                      })}

                      {formData.freeCategories.length === 0 && (
                        <p className="text-xs text-emerald-800/60 italic">No unlimited categories added yet.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: Specific Free Services */}
                {benefitsTab === 'services' && (
                  <div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-100 space-y-4">
                    <div>
                      <h4 className="text-sm font-extrabold text-rose-950">Specific Included Services</h4>
                      <p className="text-xs text-rose-700">
                        Include specific service types as 100% free across all brands (e.g. AC Deep Cleaning, Fan Repair).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-rose-800 uppercase block mb-1">Step 1: Choose Category</label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                        >
                          <option value="">Select Category first...</option>
                          {categories.map(cat => (
                            <option key={cat.id || cat._id} value={cat.id || cat._id}>{cat.title}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-rose-800 uppercase block mb-1">Step 2: Choose Service</label>
                        <select
                          value={selectedService}
                          onChange={(e) => setSelectedService(e.target.value)}
                          disabled={!selectedCategory}
                          className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl text-xs font-bold text-slate-800 outline-none disabled:bg-gray-100"
                        >
                          <option value="">{selectedCategory ? 'Select Service Type...' : 'Select Category first'}</option>
                          {(() => {
                            const uniqueNames = Array.from(new Set(filteredServices.map(s => (s.title || '').replace(/\s+/g, ' ').trim().toLowerCase()))).filter(Boolean).sort().map(tKey => {
                              const match = filteredServices.find(s => (s.title || '').replace(/\s+/g, ' ').trim().toLowerCase() === tKey);
                              return match ? match.title.replace(/\s+/g, ' ').trim() : tKey;
                            });
                            return uniqueNames.map(title => (
                              <option key={title} value={title}>All {title} Services (All Brands)</option>
                            ));
                          })()}
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!selectedCategory || !selectedService}
                      onClick={() => {
                        if (!selectedService) return;
                        const targetTitleRaw = selectedService.trim().toLowerCase();
                        const matches = filteredServices.filter(s => (s.title || '').trim().toLowerCase() === targetTitleRaw);
                        const matchIds = matches.map(s => String(s._id || s.id));
                        const currentIds = formData.freeServices.map(id => String(id?._id || id));
                        const newServices = [...new Set([...currentIds, ...matchIds])];

                        if (newServices.length > currentIds.length) {
                          setFormData(p => ({ ...p, freeServices: newServices }));
                          toast.success('Free Service added');
                          setSelectedService('');
                        } else {
                          toast.error('Service is already in the free list');
                        }
                      }}
                      className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black disabled:opacity-50 transition-all"
                    >
                      + Add Service (All Brands)
                    </button>

                    {/* Active Services Pills */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {(() => {
                        const groups = new Map();
                        formData.freeServices.forEach(svcId => {
                          const targetId = String(svcId?._id || svcId);
                          const svc = servicesList.find(s => String(s.id || s._id) === targetId);
                          if (!svc) return;

                          const catId = String(svc.categoryId?._id || svc.categoryId);
                          const title = (svc.title || '').trim().toLowerCase();
                          const key = `${catId}_${title}`;

                          if (!groups.has(key)) {
                            groups.set(key, { catId, title, ids: [] });
                          }
                          groups.get(key).ids.push(targetId);
                        });

                        return Array.from(groups.values()).map((group, idx) => {
                          const cat = categories.find(c => String(c.id || c._id) === group.catId);
                          const catName = cat ? cat.title : 'Category';
                          const displayTitle = group.title.charAt(0).toUpperCase() + group.title.slice(1);

                          return (
                            <span
                              key={idx}
                              className="pl-3 pr-2 py-1.5 bg-white text-rose-900 border border-rose-200 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2"
                            >
                              <span className="text-[9px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-black uppercase">{catName}</span>
                              <span>{displayTitle} (All Brands)</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(p => ({
                                    ...p,
                                    freeServices: p.freeServices.filter(id => !group.ids.includes(String(id?._id || id)))
                                  }));
                                }}
                                className="p-1 hover:bg-rose-100 rounded text-rose-400 hover:text-red-500 transition-colors"
                              >
                                <FiX className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          );
                        });
                      })()}

                      {formData.freeServices.length === 0 && (
                        <p className="text-xs text-rose-800/60 italic">No specific free services added yet.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: Bonus / Tier Inherited Benefits */}
                {benefitsTab === 'bonus' && (
                  <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 space-y-4">
                    <div>
                      <h4 className="text-sm font-extrabold text-amber-950">Bonus / Tier Inherited Benefits</h4>
                      <p className="text-xs text-amber-700">
                        Add services that this tier inherits or gets as complimentary bonus perks from lower plans.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-amber-800 uppercase block mb-1">Step 1: Choose Category</label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                        >
                          <option value="">Select Category first...</option>
                          {categories.map(cat => (
                            <option key={cat.id || cat._id} value={cat.id || cat._id}>{cat.title}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-amber-800 uppercase block mb-1">Step 2: Choose Service</label>
                        <select
                          value={selectedService}
                          onChange={(e) => setSelectedService(e.target.value)}
                          disabled={!selectedCategory}
                          className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-800 outline-none disabled:bg-gray-100"
                        >
                          <option value="">{selectedCategory ? 'Select Service Type...' : 'Select Category first'}</option>
                          {(() => {
                            const uniqueNames = Array.from(new Set(filteredServices.map(s => (s.title || '').replace(/\s+/g, ' ').trim().toLowerCase()))).filter(Boolean).sort().map(tKey => {
                              const match = filteredServices.find(s => (s.title || '').replace(/\s+/g, ' ').trim().toLowerCase() === tKey);
                              return match ? match.title.replace(/\s+/g, ' ').trim() : tKey;
                            });
                            return uniqueNames.map(title => (
                              <option key={title} value={title}>All {title} Services (All Brands)</option>
                            ));
                          })()}
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!selectedCategory || !selectedService}
                      onClick={() => {
                        const selectionTitleRaw = (selectedService || '').trim().toLowerCase();
                        if (!selectionTitleRaw) return;

                        const matches = filteredServices.filter(s => (s.title || '').trim().toLowerCase() === selectionTitleRaw);
                        let addedAny = false;
                        const newBonusEntries = [...formData.bonusServices];

                        matches.forEach(svcObj => {
                          const svcId = String(svcObj._id || svcObj.id);
                          if (!newBonusEntries.some(bs => String(bs.serviceId?._id || bs.serviceId) === svcId)) {
                            newBonusEntries.push({
                              categoryId: selectedCategory,
                              serviceId: svcObj
                            });
                            addedAny = true;
                          }
                        });

                        if (addedAny) {
                          setFormData(p => ({ ...p, bonusServices: newBonusEntries }));
                          setSelectedService('');
                          toast.success('Bonus perks added');
                        } else {
                          toast.error('Service is already in bonus list');
                        }
                      }}
                      className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black disabled:opacity-50 transition-all"
                    >
                      + Add Bonus Perk Group
                    </button>

                    {/* Active Bonus Pills */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {(() => {
                        const bonusGroups = new Map();
                        formData.bonusServices.forEach(bs => {
                          const sid = String(bs.serviceId?._id || bs.serviceId);
                          const sObj = servicesList.find(s => String(s.id || s._id) === sid);
                          if (!sObj) return;

                          const cid = String(bs.categoryId?._id || bs.categoryId);
                          const title = (sObj.title || '').trim().toLowerCase();
                          const key = `${cid}_${title}`;

                          if (!bonusGroups.has(key)) {
                            bonusGroups.set(key, { bs, title, sid, cid, ids: [] });
                          }
                          bonusGroups.get(key).ids.push(sid);
                        });

                        return Array.from(bonusGroups.values()).map((group, idx) => {
                          const cat = categories.find(c => String(c._id || c.id) === group.cid);
                          const catName = cat ? cat.title : 'Category';
                          const displayTitle = group.title.charAt(0).toUpperCase() + group.title.slice(1);

                          return (
                            <span
                              key={idx}
                              className="pl-3 pr-2 py-1.5 bg-white text-amber-950 border border-amber-200 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2"
                            >
                              <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-black uppercase">{catName}</span>
                              <span>{displayTitle} (Tier Bonus)</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(p => ({
                                    ...p,
                                    bonusServices: p.bonusServices.filter(b => {
                                      const sid = b.serviceId?._id || b.serviceId;
                                      return !group.ids.includes(String(sid));
                                    })
                                  }));
                                }}
                                className="p-1 hover:bg-amber-100 rounded text-amber-400 hover:text-red-500 transition-colors"
                              >
                                <FiX className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          );
                        });
                      })()}

                      {formData.bonusServices.length === 0 && (
                        <p className="text-xs text-amber-800/60 italic">No bonus services added yet.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-extrabold rounded-xl text-sm shadow-md shadow-primary-600/30 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <FiCheck className="w-4 h-4" />
                      {currentPlan ? 'Save Changes' : 'Create Plan'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Plans;
