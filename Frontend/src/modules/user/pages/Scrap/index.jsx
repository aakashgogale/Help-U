import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  FiPlus, FiMapPin, FiClock, FiCheckCircle, FiTrash2, FiX, FiCheck, FiTag, FiCamera,
  FiTruck, FiAlertCircle, FiChevronRight
} from 'react-icons/fi';
import { FaRecycle } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../../../../services/api';
import { AnimatePresence, motion } from 'framer-motion';
import { useConfig } from '../../../../context/ConfigContext';
import PageHeader from '../../components/layout/PageHeader';
import useBookingConfig from '../../../../hooks/useBookingConfig';
import WeighedBox from './WeighedBox';
import ModalLock from '../../../../components/common/ModalLock';

const ACTIVE_STATUSES = ['pending', 'offered', 'accepted', 'weighed'];
const HISTORY_STATUSES = ['completed', 'cancelled', 'rejected'];
const DELETABLE_STATUSES = ['pending', 'cancelled', 'rejected'];

const STATUS_META = {
  pending: { label: 'Under review', className: 'bg-amber-50 text-amber-700' },
  offered: { label: 'Offer received', className: 'bg-blue-50 text-blue-700' },
  accepted: { label: 'Pickup scheduled', className: 'bg-accent-soft text-accent' },
  weighed: { label: 'Confirm amount', className: 'bg-blue-50 text-blue-700' },
  completed: { label: 'Completed', className: 'bg-gray-100 text-gray-600' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-600' },
  cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-600' },
};

const getStatusMeta = (status) => STATUS_META[status] || {
  label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown',
  className: 'bg-gray-100 text-gray-600'
};

const formatPrice = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const StatusChip = ({ status }) => {
  const meta = getStatusMeta(status);
  return (
    <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${meta.className}`}>
      {meta.label}
    </span>
  );
};

const ScrapThumb = ({ item, size = 'w-[72px] h-[72px]' }) => (
  <div className={`${size} rounded-2xl overflow-hidden shrink-0 bg-accent-soft flex items-center justify-center`}>
    {item.images?.length > 0 ? (
      <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
    ) : (
      <FaRecycle className="w-7 h-7 text-accent" />
    )}
  </div>
);

// Admin price offer with Accept / Reject
const OfferBox = ({ item, responding, onRespond, large = false }) => (
  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5" onClick={(e) => e.stopPropagation()}>
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[12px] font-semibold text-blue-700">Price offered</p>
        <p className={`${large ? 'text-[24px]' : 'text-[20px]'} font-bold text-ink leading-tight`}>{formatPrice(item.offeredPrice)}</p>
      </div>
      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-600">
        <FiTag className="w-[18px] h-[18px]" />
      </div>
    </div>
    {item.adminNote && (
      <p className="mt-2 text-[12px] text-gray-600 bg-white rounded-xl px-3 py-2">{item.adminNote}</p>
    )}
    <div className="mt-3 flex gap-2">
      <button
        type="button"
        onClick={(e) => onRespond(e, item._id, 'accept', item.offeredPrice)}
        disabled={responding}
        className="flex-1 h-10 rounded-full bg-accent text-white text-[13px] font-semibold hover:bg-accent-dark active:scale-[0.98] transition-all inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
      >
        <FiCheck className="w-4 h-4" strokeWidth={2.5} /> Accept {formatPrice(item.offeredPrice)}
      </button>
      <button
        type="button"
        onClick={(e) => onRespond(e, item._id, 'reject', item.offeredPrice)}
        disabled={responding}
        className="h-10 px-4 rounded-full border border-red-200 bg-white text-red-600 text-[13px] font-semibold hover:bg-red-50 active:scale-[0.98] transition-all inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
      >
        <FiX className="w-4 h-4" strokeWidth={2.5} /> Reject
      </button>
    </div>
  </div>
);

const HOW_IT_WORKS = [
  { icon: FiCamera, title: 'List your scrap', text: 'Add photos and pickup address' },
  { icon: FiTag, title: 'Get a price offer', text: 'We review and send the best rate' },
  { icon: FiTruck, title: 'Free pickup', text: 'Accept the offer and get paid' },
];

// Last loaded listings, kept across visits so returning to this page is instant.
// Tied to the current login so another account never sees them.
let scrapCache = null;
const currentSession = () => localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || '';
const readScrapCache = () => (scrapCache && scrapCache.session === currentSession() ? scrapCache.items : null);

const UserScrapPage = () => {
  const navigate = useNavigate();
  const { isScrapEnabled, configLoaded } = useConfig();
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'
  const [scraps, setScraps] = useState(() => readScrapCache() || []);
  const [loading, setLoading] = useState(() => !readScrapCache());
  const [selectedScrap, setSelectedScrap] = useState(null);
  const [respondingToOffer, setRespondingToOffer] = useState(false);
  const { scrapAllowCashPayout } = useBookingConfig();

  const fetchMyScrap = useCallback(async () => {
    const hasShownData = Boolean(readScrapCache());
    try {
      // Skeleton only when nothing is on screen yet; otherwise refresh quietly
      if (!hasShownData) setLoading(true);
      const res = await api.get('/scrap/my');
      if (res.data.success) {
        const items = res.data.data || [];
        setScraps(items);
        scrapCache = { items, session: currentSession() };
      }
    } catch (err) {
      console.error(err);
      if (!hasShownData) toast.error('Failed to load scrap items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (configLoaded && isScrapEnabled) {
      fetchMyScrap();
    }
  }, [configLoaded, isScrapEnabled, fetchMyScrap]);

  // Lock page scroll while the details sheet is open
  useEffect(() => {
    if (!selectedScrap) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [selectedScrap]);

  const handleRespondOffer = async (e, scrapId, action, price) => {
    if (e) e.stopPropagation();
    if (action === 'reject' && !window.confirm(`Are you sure you want to reject the offer of ₹${price || ''}?`)) {
      return;
    }

    try {
      setRespondingToOffer(true);
      toast.loading(action === 'accept' ? 'Accepting offer...' : 'Rejecting offer...', { id: 'offer-resp' });
      const res = await api.put(`/scrap/${scrapId}/respond`, { action });
      if (res.data.success) {
        toast.success(res.data.message || (action === 'accept' ? 'Offer accepted! Pickup will be scheduled.' : 'Offer rejected.'), { id: 'offer-resp' });
        if (selectedScrap && selectedScrap._id === scrapId) {
          setSelectedScrap(res.data.data);
        }
        fetchMyScrap();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update offer', { id: 'offer-resp' });
    } finally {
      setRespondingToOffer(false);
    }
  };

  // The customer confirms the weighed amount (and is paid), or questions the weight
  const handleWeighing = async (scrapId, action, body, successFallback) => {
    try {
      setRespondingToOffer(true);
      const res = await api.put(`/scrap/${scrapId}/${action}`, body);
      if (res.data.success) {
        toast.success(res.data.message || successFallback);
        if (selectedScrap && selectedScrap._id === scrapId) setSelectedScrap(res.data.data);
        fetchMyScrap();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setRespondingToOffer(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this listing?')) return;

    try {
      toast.loading('Deleting listing...', { id: 'delete-scrap' });
      const res = await api.delete(`/scrap/${id}`);
      if (res.data.success) {
        toast.success('Listing deleted successfully', { id: 'delete-scrap' });
        setSelectedScrap(null);
        fetchMyScrap();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete listing', { id: 'delete-scrap' });
    }
  };

  const activeScraps = scraps.filter(s => ACTIVE_STATUSES.includes(s.status));
  const historyScraps = scraps.filter(s => HISTORY_STATUSES.includes(s.status));
  const visibleScraps = activeTab === 'active' ? activeScraps : historyScraps;

  if (!configLoaded) {
    return <div className="min-h-screen bg-canvas" />;
  }

  if (!isScrapEnabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-canvas">
        <div className="w-20 h-20 rounded-full bg-accent-soft flex items-center justify-center mb-5">
          <FaRecycle className="w-8 h-8 text-accent" />
        </div>
        <h2 className="text-[18px] font-bold text-ink mb-1.5">Scrap service unavailable</h2>
        <p className="text-[14px] text-gray-500 max-w-xs mb-6 leading-relaxed">
          Scrap selling is currently turned off. Please check back later.
        </p>
        <button
          type="button"
          onClick={() => navigate('/user')}
          className="h-11 px-6 rounded-full bg-accent text-white text-[14px] font-semibold hover:bg-accent-dark active:scale-95 transition-all"
        >
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 bg-canvas">
      <PageHeader title="Sell Scrap">
        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="grid grid-cols-2 p-1 rounded-full bg-gray-100" role="tablist">
            {[
              { id: 'active', label: 'Active', count: activeScraps.length },
              { id: 'history', label: 'History', count: historyScraps.length },
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`h-9 rounded-full text-[13px] font-semibold transition-all ${isActive ? 'bg-white text-ink shadow-[0_1px_4px_rgba(15,27,45,0.12)]' : 'text-gray-500 hover:text-ink'}`}
                >
                  {tab.label}
                  {!loading && tab.count > 0 && (
                    <span className={`ml-1.5 text-[11px] font-bold ${isActive ? 'text-accent' : 'text-gray-400'}`}>{tab.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </PageHeader>

      <main className="px-4 py-4 max-w-2xl mx-auto w-full space-y-3">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-[20px] border border-gray-100 p-4 animate-pulse flex gap-3">
              <div className="w-[72px] h-[72px] rounded-2xl bg-gray-100" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 w-36 bg-gray-100 rounded" />
                <div className="h-3 w-48 bg-gray-100 rounded" />
                <div className="h-3 w-24 bg-gray-100 rounded" />
              </div>
            </div>
          ))
        ) : visibleScraps.length === 0 ? (
          activeTab === 'active' ? (
            <div className="bg-white rounded-[20px] border border-gray-100 p-5">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-accent-soft flex items-center justify-center mb-4">
                  <FaRecycle className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-[18px] font-bold text-ink">Turn your scrap into cash</h3>
                <p className="mt-1 text-[14px] text-gray-500 max-w-xs">List old appliances, metal or paper and get the best market rate with free doorstep pickup.</p>
              </div>
              <ol className="mt-5 space-y-3">
                {HOW_IT_WORKS.map((step, index) => {
                  const StepIcon = step.icon;
                  return (
                    <li key={step.title} className="flex items-center gap-3 rounded-2xl bg-canvas px-3.5 py-3">
                      <span className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-accent shrink-0">
                        <StepIcon className="w-[18px] h-[18px]" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-ink">{index + 1}. {step.title}</p>
                        <p className="text-[12px] text-gray-500">{step.text}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <button
                type="button"
                onClick={() => navigate('/user/scrap/add')}
                className="mt-5 w-full h-12 rounded-full bg-accent text-white text-[15px] font-semibold hover:bg-accent-dark active:scale-[0.98] transition-all inline-flex items-center justify-center gap-2"
              >
                <FiPlus className="w-5 h-5" /> List scrap for pickup
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-5">
                <FiClock className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-ink text-[18px] font-bold mb-1.5">No past listings</h3>
              <p className="text-gray-500 text-[14px] max-w-xs">Completed, rejected and cancelled listings will appear here.</p>
            </div>
          )
        ) : (
          visibleScraps.map(item => (
            <article
              key={item._id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedScrap(item)}
              onKeyDown={(e) => { if (e.key === 'Enter') setSelectedScrap(item); }}
              className="bg-white rounded-[20px] border border-gray-100 p-4 cursor-pointer hover:border-accent/25 active:scale-[0.99] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <div className="flex gap-3">
                <ScrapThumb item={item} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[16px] font-bold text-ink leading-snug line-clamp-1">{item.title}</h3>
                    <StatusChip status={item.status} />
                  </div>
                  {item.description && (
                    <p className="mt-0.5 text-[13px] text-gray-500 line-clamp-2">{item.description}</p>
                  )}
                  <p className="mt-1.5 inline-flex items-center gap-1 text-[12px] text-gray-400">
                    <FiClock className="w-3.5 h-3.5" /> Listed {formatDate(item.createdAt)}
                  </p>
                </div>
              </div>

              {item.status === 'offered' && (
                <div className="mt-3">
                  <OfferBox item={item} responding={respondingToOffer} onRespond={handleRespondOffer} />
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                {item.status === 'weighed' ? (
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue-700">
                    <FiAlertCircle className="w-4 h-4" /> Confirm {formatPrice(item.finalPrice)}
                  </span>
                ) : item.status === 'accepted' ? (
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent">
                    <FiCheckCircle className="w-4 h-4" />
                    {item.items?.length > 0 && item.pickupDate
                      ? `Pickup ${new Date(item.pickupDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}${item.pickupSlot ? `, ${item.pickupSlot}` : ''}`
                      : `Accepted${item.finalPrice ? ` at ${formatPrice(item.finalPrice)}` : ''}`}
                  </span>
                ) : item.status === 'offered' ? (
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue-700">
                    <FiAlertCircle className="w-4 h-4" /> Action required
                  </span>
                ) : item.status === 'completed' && item.finalPrice ? (
                  <span className="text-[13px] font-semibold text-ink">Sold for {formatPrice(item.finalPrice)}</span>
                ) : item.status === 'pending' && item.estimatedTotal > 0 ? (
                  <span className="text-[13px] font-semibold text-ink">
                    Estimate {formatPrice(item.estimatedTotal)}{item.hasQuoteItems ? ' + quote' : ''}
                  </span>
                ) : (
                  <span className="text-[13px] text-gray-500">{item.address?.city || 'Pickup address saved'}</span>
                )}
                <div className="flex items-center gap-1">
                  {DELETABLE_STATUSES.includes(item.status) && (
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, item._id)}
                      aria-label="Delete listing"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  )}
                  <span className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-accent">
                    Details <FiChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </article>
          ))
        )}
      </main>

      {/* Add listing */}
      {!loading && (activeTab === 'history' || activeScraps.length > 0) && (
        <button
          type="button"
          onClick={() => navigate('/user/scrap/add')}
          aria-label="List new scrap"
          className="fixed bottom-28 right-4 z-30 h-14 pl-4 pr-5 rounded-full bg-accent text-white text-[14px] font-semibold shadow-[0_10px_24px_-8px_rgba(15,116,87,0.6)] hover:bg-accent-dark active:scale-95 transition-all inline-flex items-center gap-2"
        >
          <FiPlus className="w-5 h-5" /> Sell scrap
        </button>
      )}

      {/* Listing details sheet (portal, so it sits above the bottom nav) */}
      {createPortal(
        <AnimatePresence>
          {selectedScrap && (
            <>
              <ModalLock />
              <motion.div
                key="scrap-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedScrap(null)}
                className="fixed inset-0 bg-black/50 z-[60]"
              />
              <motion.div
                key="scrap-sheet"
                role="dialog"
                aria-modal="true"
                aria-label={selectedScrap.title}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 32, stiffness: 340 }}
                className="fixed bottom-0 inset-x-0 z-[70] mx-auto w-full max-w-2xl bg-white rounded-t-[28px] max-h-[88vh] flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                <div className="pt-2.5 flex justify-center">
                  <span className="w-10 h-1 rounded-full bg-gray-200" />
                </div>
                <div className="px-5 pt-3 pb-3 flex items-start justify-between gap-3 border-b border-gray-100">
                  <div className="min-w-0">
                    <h2 className="text-[18px] font-bold text-ink leading-snug">{selectedScrap.title}</h2>
                    <div className="mt-1.5"><StatusChip status={selectedScrap.status} /></div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedScrap(null)}
                    aria-label="Close"
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 active:scale-95 transition-all shrink-0"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                  {selectedScrap.images?.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {selectedScrap.images.map((img, i) => (
                        <div
                          key={i}
                          className={`rounded-2xl overflow-hidden bg-gray-50 ${i === 0 && selectedScrap.images.length % 2 !== 0 ? 'col-span-2 aspect-video' : 'aspect-square'}`}
                        >
                          <img src={img} alt={`${selectedScrap.title} ${i + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedScrap.status === 'offered' && (
                    <OfferBox item={selectedScrap} responding={respondingToOffer} onRespond={handleRespondOffer} large />
                  )}

                  {selectedScrap.status === 'weighed' && (
                    <WeighedBox
                      item={selectedScrap}
                      busy={respondingToOffer}
                      cashAllowed={!!scrapAllowCashPayout}
                      onConfirm={(method) => handleWeighing(selectedScrap._id, 'confirm', { payoutMethod: method }, 'Confirmed')}
                      onDispute={(reason) => handleWeighing(selectedScrap._id, 'dispute', { reason }, 'Sent to our team')}
                    />
                  )}

                  {selectedScrap.status === 'accepted' && selectedScrap.items?.length > 0 && selectedScrap.pickupDate && (
                    <div className="rounded-2xl bg-accent-soft px-4 py-3">
                      <p className="text-[12px] font-semibold text-accent">Pickup</p>
                      <p className="text-[15px] font-bold text-ink">
                        {new Date(selectedScrap.pickupDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                        {selectedScrap.pickupSlot ? `, ${selectedScrap.pickupSlot}` : ''}
                      </p>
                      <p className="text-[12px] text-gray-600">You are paid by the weight when the professional arrives.</p>
                    </div>
                  )}

                  {(selectedScrap.status === 'accepted' || selectedScrap.status === 'completed') && selectedScrap.finalPrice && (
                    <div className="rounded-2xl bg-accent-soft px-4 py-3 flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-accent">
                        {selectedScrap.status === 'completed' ? 'Sold for' : 'Agreed price'}
                      </span>
                      <span className="text-[18px] font-bold text-ink">{formatPrice(selectedScrap.finalPrice)}</span>
                    </div>
                  )}

                  {selectedScrap.items?.length > 0 && (
                    <div>
                      <p className="text-[12px] font-semibold text-gray-500 mb-1.5">What you are selling</p>
                      <ul className="rounded-2xl bg-canvas divide-y divide-gray-100">
                        {selectedScrap.items.map((it) => (
                          <li key={it._id || it.name} className="px-3.5 py-3">
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="text-[14px] font-semibold text-ink">
                                {it.name} · {it.actualQuantity != null ? `${it.actualQuantity} ${it.unit}` : `${it.quantity} ${it.unit}`}
                              </span>
                              <span className="text-[13px] font-semibold text-gray-600">
                                {it.finalAmount != null
                                  ? formatPrice(it.finalAmount)
                                  : it.pricingMode === 'quote'
                                    ? (it.quotedAmount != null ? formatPrice(it.quotedAmount) : 'To be quoted')
                                    : formatPrice(it.estimatedAmount)}
                              </span>
                            </div>
                            {it.actualQuantity != null && it.actualQuantity !== it.quantity ? (
                              <p className="text-[12px] text-gray-400">You said {it.quantity} {it.unit}{it.pricingMode !== 'quote' ? ` · ${formatPrice(it.rate)} per ${it.unit}` : ''}</p>
                            ) : it.pricingMode !== 'quote' && (
                              <p className="text-[12px] text-gray-400">{formatPrice(it.rate)} per {it.unit}</p>
                            )}
                            {it.details?.length > 0 && (
                              <p className="mt-0.5 text-[12px] text-gray-500">{it.details.map((d) => `${d.label}: ${d.value}`).join(' · ')}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                      {selectedScrap.finalPrice != null && ['weighed', 'completed'].includes(selectedScrap.status) ? (
                        <p className="mt-2 flex items-baseline justify-between px-1 text-[13px]">
                          <span className="font-semibold text-gray-500">{selectedScrap.status === 'completed' ? 'Paid' : 'Amount'}</span>
                          <span className="text-[16px] font-bold text-ink">{formatPrice(selectedScrap.finalPrice)}</span>
                        </p>
                      ) : (
                        <>
                          {selectedScrap.estimatedTotal > 0 && (
                            <p className="mt-2 flex items-baseline justify-between px-1 text-[13px]">
                              <span className="font-semibold text-gray-500">Estimated total</span>
                              <span className="text-[16px] font-bold text-ink">{formatPrice(selectedScrap.estimatedTotal)}</span>
                            </p>
                          )}
                          <p className="mt-1 px-1 text-[12px] text-gray-400">The final amount is worked out from the weight at pickup.</p>
                        </>
                      )}
                      {selectedScrap.status === 'completed' && selectedScrap.payout?.method && (
                        <p className="mt-1 px-1 text-[12px] text-gray-500">
                          {selectedScrap.payout.method === 'wallet' ? 'Added to your Help U wallet.' : 'Paid to you in cash.'}
                        </p>
                      )}
                    </div>
                  )}

                  {selectedScrap.description && (
                    <div>
                      <p className="text-[12px] font-semibold text-gray-500 mb-1">Description</p>
                      <p className="text-[14px] text-gray-700 leading-relaxed">{selectedScrap.description}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-[12px] font-semibold text-gray-500 mb-1.5">Pickup address</p>
                    <div className="flex items-start gap-2.5 rounded-2xl bg-canvas px-3.5 py-3">
                      <FiMapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-ink">{selectedScrap.address?.addressLine1 || 'Address not available'}</p>
                        {(selectedScrap.address?.city || selectedScrap.address?.state) && (
                          <p className="text-[12px] text-gray-500 mt-0.5">
                            {[selectedScrap.address?.city, selectedScrap.address?.state].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
                    <FiClock className="w-3.5 h-3.5" /> Listed on {formatDate(selectedScrap.createdAt)}
                  </p>
                </div>

                <div className="px-5 pt-3 pb-5 border-t border-gray-100 flex gap-2" style={{ paddingBottom: 'max(20px, var(--safe-bottom))' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedScrap(null)}
                    className="flex-1 h-11 rounded-full border border-gray-200 bg-white text-[14px] font-semibold text-ink hover:border-gray-300 active:scale-[0.98] transition-all"
                  >
                    Close
                  </button>
                  {DELETABLE_STATUSES.includes(selectedScrap.status) && (
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, selectedScrap._id)}
                      className="h-11 px-5 rounded-full border border-red-200 bg-white text-red-600 text-[14px] font-semibold hover:bg-red-50 active:scale-[0.98] transition-all inline-flex items-center gap-1.5"
                    >
                      <FiTrash2 className="w-4 h-4" /> Delete
                    </button>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default UserScrapPage;
