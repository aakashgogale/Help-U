import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiPlus,
  FiArrowUpRight,
  FiArrowDownLeft,
  FiRefreshCw,
  FiShield,
  FiGift,
  FiZap,
  FiInfo,
  FiChevronRight,
  FiX,
  FiCheckCircle,
  FiAlertTriangle,
  FiSearch,
  FiCreditCard,
  FiClock
} from 'react-icons/fi';
import { MdAccountBalanceWallet, MdVerified, MdLockOutline } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { walletService } from '../../../../services/walletService';
import LogoLoader from '../../../../components/common/LogoLoader';
import NotificationBell from '../../components/common/NotificationBell';
import { themeColors } from '../../../../theme';

/**
 * Ensures Razorpay checkout script is loaded
 */
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existingScript = document.getElementById('razorpay-checkout-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const PRESET_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

const Wallet = () => {
  const navigate = useNavigate();
  const [walletData, setWalletData] = useState({
    balance: 0,
    penalty: 0,
    promoBalance: 0,
    cashbackBalance: 0,
    totalAvailable: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Search states
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'credit' | 'debit'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);

  // Add Money Form state
  const [topupAmount, setTopupAmount] = useState('500');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Load wallet details & transaction history
  const loadWalletData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [balanceRes, transactionsRes] = await Promise.all([
        walletService.getBalance(),
        walletService.getTransactions({ limit: 50 })
      ]);

      if (balanceRes.success) {
        const d = balanceRes.data || {};
        setWalletData({
          balance: Number(d.balance) || 0,
          penalty: Number(d.penalty) || 0,
          promoBalance: Number(d.promoBalance) || 0,
          cashbackBalance: Number(d.cashbackBalance) || 0,
          totalAvailable: d.totalAvailable !== undefined ? Number(d.totalAvailable) : (Number(d.balance) || 0)
        });
      }

      if (transactionsRes.success) {
        setTransactions(transactionsRes.data || []);
      }
    } catch (error) {
      console.error('Wallet data fetch error:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWalletData();
  }, [loadWalletData]);

  // Handle Add Money Modal Opening (with optional preset)
  const openAddMoneyModal = (preset = null) => {
    if (preset) {
      setTopupAmount(String(preset));
    } else if (!topupAmount || Number(topupAmount) < 100) {
      setTopupAmount('500');
    }
    setShowAddMoneyModal(true);
  };

  // Execute Razorpay Payment for Topup
  const handleProceedTopup = async () => {
    const numericAmount = parseFloat(topupAmount);

    if (isNaN(numericAmount) || numericAmount < 100) {
      toast.error('Minimum top-up amount is ₹100');
      return;
    }

    if (numericAmount > 50000) {
      toast.error('Maximum top-up amount is ₹50,000 per transaction');
      return;
    }

    try {
      setProcessingPayment(true);
      toast.loading('Initializing payment...', { id: 'wallet-topup' });

      // Ensure Razorpay SDK is ready
      const isSdkLoaded = await loadRazorpayScript();
      if (!isSdkLoaded || !window.Razorpay) {
        toast.dismiss('wallet-topup');
        toast.error('Payment gateway could not be loaded. Please check your internet connection.');
        setProcessingPayment(false);
        return;
      }

      // Step 1: Create Razorpay Order on Backend
      const orderRes = await walletService.addMoney(numericAmount);

      toast.dismiss('wallet-topup');

      if (!orderRes.success || !orderRes.data) {
        toast.error(orderRes.message || 'Failed to initiate payment');
        setProcessingPayment(false);
        return;
      }

      const orderData = orderRes.data;
      const razorpayKey = orderData.key;

      if (!razorpayKey) {
        toast.error('Razorpay configuration missing');
        setProcessingPayment(false);
        return;
      }

      // Retrieve user profile data for prefill
      let userData = {};
      try {
        userData = JSON.parse(localStorage.getItem('userData') || '{}');
      } catch (e) {
        userData = {};
      }

      // Step 2: Configure Razorpay Checkout Options
      const options = {
        key: razorpayKey,
        amount: Math.round(Number(orderData.amount) * 100), // in paise
        currency: orderData.currency || 'INR',
        order_id: orderData.orderId,
        name: 'Help U Wallet Top-up',
        description: `Add ₹${numericAmount.toLocaleString('en-IN')} to Help U Wallet`,
        image: '/helpu-logo.png',
        handler: async function (response) {
          try {
            setProcessingPayment(true);
            toast.loading('Verifying payment and crediting wallet...', { id: 'wallet-verify' });

            const verifyRes = await walletService.verifyTopup({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: numericAmount
            });

            toast.dismiss('wallet-verify');

            if (verifyRes.success) {
              toast.success(`🎉 ₹${numericAmount.toLocaleString('en-IN')} added to your wallet!`, {
                duration: 4000
              });
              setShowAddMoneyModal(false);
              // Refresh wallet data immediately
              loadWalletData(true);
            } else {
              toast.error(verifyRes.message || 'Payment verification failed');
            }
          } catch (error) {
            console.error('Wallet verification error:', error);
            toast.dismiss('wallet-verify');
            toast.error(error.response?.data?.message || 'Payment verification failed. If deducted, it will reflect shortly.');
          } finally {
            setProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: function () {
            setProcessingPayment(false);
            toast('Payment cancelled', { icon: 'ℹ️' });
          }
        },
        prefill: {
          name: userData.name || 'Help U User',
          email: userData.email || '',
          contact: userData.phone || ''
        },
        theme: {
          color: themeColors?.brand?.navy || '#163B66'
        }
      };

      const razorpayInstance = new window.Razorpay(options);

      razorpayInstance.on('payment.failed', function (failResponse) {
        setProcessingPayment(false);
        toast.dismiss('wallet-topup');
        toast.error(`Payment failed: ${failResponse.error?.description || 'Transaction was declined'}`);
      });

      razorpayInstance.open();
    } catch (error) {
      console.error('Wallet topup process error:', error);
      toast.dismiss('wallet-topup');
      toast.error(error.response?.data?.message || 'Failed to start payment. Please try again.');
      setProcessingPayment(false);
    }
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      const isCredit = ['credit', 'refund', 'topup', 'referral', 'cashback', 'promo_credit', 'referral_bonus'].includes(item.type);
      const isDebit = ['payment', 'withdrawal', 'platform_fee', 'convenience_fee', 'gst', 'penalty', 'fine', 'cancellation_fee', 'debit'].includes(item.type);

      if (activeTab === 'credit' && !isCredit) return false;
      if (activeTab === 'debit' && !isDebit) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const desc = (item.description || item.title || '').toLowerCase();
        const type = (item.type || '').toLowerCase();
        const amountStr = String(item.amount || '');
        return desc.includes(query) || type.includes(query) || amountStr.includes(query);
      }

      return true;
    });
  }, [transactions, activeTab, searchQuery]);

  // Lifetime spent calculation
  const totalSpent = useMemo(() => {
    return transactions
      .filter((t) => ['payment', 'withdrawal', 'platform_fee', 'convenience_fee', 'gst', 'cash_collected'].includes(t.type))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [transactions]);

  // Helper styling for transaction items
  const getTransactionVisuals = (type) => {
    switch (type) {
      case 'credit':
      case 'topup':
        return {
          bg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
          badgeBg: 'bg-emerald-50 text-emerald-700',
          icon: <FiArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />,
          sign: '+',
          color: 'text-emerald-600',
          label: 'Top-up'
        };
      case 'cashback':
      case 'promo_credit':
      case 'referral':
      case 'referral_bonus':
        return {
          bg: 'bg-amber-50 text-amber-600 border border-amber-100',
          badgeBg: 'bg-amber-50 text-amber-700',
          icon: <FiGift className="w-3.5 h-3.5 stroke-[2.5]" />,
          sign: '+',
          color: 'text-amber-600',
          label: type === 'cashback' ? 'Cashback' : 'Reward'
        };
      case 'refund':
        return {
          bg: 'bg-teal-50 text-teal-600 border border-teal-100',
          badgeBg: 'bg-teal-50 text-teal-700',
          icon: <FiRefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />,
          sign: '+',
          color: 'text-teal-600',
          label: 'Refund'
        };
      case 'penalty':
      case 'fine':
      case 'cancellation_fee':
        return {
          bg: 'bg-orange-50 text-orange-600 border border-orange-100',
          badgeBg: 'bg-orange-50 text-orange-700',
          icon: <FiAlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />,
          sign: '-',
          color: 'text-orange-600',
          label: 'Penalty'
        };
      case 'payment':
      case 'withdrawal':
      case 'platform_fee':
      case 'convenience_fee':
      case 'gst':
      default:
        return {
          bg: 'bg-rose-50 text-rose-600 border border-rose-100',
          badgeBg: 'bg-rose-50 text-rose-700',
          icon: <FiArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />,
          sign: '-',
          color: 'text-rose-600',
          label: 'Payment'
        };
    }
  };

  return (
    <div className="min-h-screen pb-20 relative bg-[#F8FAFC]">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(at 0% 0%, ${themeColors?.brand?.navy || '#163B66'}12 0%, transparent 55%),
              radial-gradient(at 100% 0%, ${themeColors?.brand?.yellow || '#D68F35'}12 0%, transparent 50%),
              #F8FAFC
            `
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `radial-gradient(${themeColors?.brand?.navy || '#163B66'} 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Compact Header */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/85 border-b border-slate-200/60 px-4 py-2.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-xs border border-slate-200/80 active:scale-95 transition-all text-slate-700 hover:text-black hover:border-slate-300"
              aria-label="Back"
            >
              <FiArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-tight">Help U Wallet</h1>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">Instant 1-tap checkout & rewards</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => loadWalletData(true)}
              disabled={refreshing}
              className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-xs border border-slate-200/80 active:scale-95 transition-all text-slate-600 hover:text-slate-900"
              title="Refresh Balance"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-600' : ''}`} />
            </button>
            <NotificationBell />
          </div>
        </header>

        <main className="max-w-xl mx-auto px-3.5 py-3.5 space-y-3">
          {/* ============================================================== */}
          {/* COMPACT HERO WALLET CARD                                      */}
          {/* ============================================================== */}
          <div className="relative overflow-hidden rounded-2xl text-white shadow-lg bg-gradient-to-br from-[#0F2B48] via-[#163B66] to-[#1E4C82] border border-white/10 p-4">
            {/* Ambient Lighting Orbs */}
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#D68F35]/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-[#16A34A]/15 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 space-y-3">
              {/* Card Top Row: Mini Brand & Security */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center border border-white/15">
                    <MdAccountBalanceWallet className="w-3 h-3 text-amber-300" />
                  </div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-white/80 flex items-center gap-1">
                    Help U Pay
                    <MdVerified className="w-3 h-3 text-teal-300" />
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {walletData.penalty > 0 ? (
                    <span className="text-[10px] bg-rose-500/30 text-rose-200 border border-rose-400/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <FiAlertTriangle className="w-2.5 h-2.5" />
                      -₹{walletData.penalty.toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className="text-[9px] bg-white/10 text-emerald-300 border border-white/15 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <FiShield className="w-2.5 h-2.5 text-emerald-300" />
                      Protected
                    </span>
                  )}
                </div>
              </div>

              {/* Main Row: Balance on Left, Compact Add Money Button on Right */}
              <div className="flex items-center justify-between gap-3 pt-0.5">
                <div>
                  <div className="flex items-center gap-1 text-white/60 mb-0.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider">Available Balance</p>
                    <button
                      type="button"
                      onClick={() => setShowBreakdownModal(true)}
                      className="text-white/50 hover:text-white transition-colors"
                      title="View Breakdown"
                    >
                      <FiInfo className="w-3 h-3" />
                    </button>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-baseline">
                    <span className="text-lg font-bold text-amber-300 mr-0.5">₹</span>
                    {walletData.totalAvailable.toLocaleString('en-IN')}
                  </h2>
                </div>

                {/* Compact Add Money Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => openAddMoneyModal()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-900 font-extrabold text-xs shadow-md shadow-amber-500/20 border border-amber-200/50 cursor-pointer active:scale-95 transition-all"
                >
                  <FiPlus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Add Money</span>
                </motion.button>
              </div>

              {/* Quick Top-up Pills Strip */}
              <div className="pt-2 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-[10px] font-medium text-white/50 shrink-0">Quick Add:</span>
                {[100, 200, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => openAddMoneyModal(amt)}
                    className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 text-[10px] font-bold text-white transition-all shrink-0"
                  >
                    +₹{amt}
                  </button>
                ))}
              </div>

              {/* Compact 3-Column Breakdown Bar */}
              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/10 text-center">
                <div
                  onClick={() => setShowBreakdownModal(true)}
                  className="bg-white/5 hover:bg-white/10 rounded-lg py-1.5 px-1.5 cursor-pointer transition-colors"
                >
                  <p className="text-[9px] text-slate-300 font-medium">Wallet Cash</p>
                  <p className="text-xs font-bold text-white mt-0.5">₹{walletData.balance.toLocaleString('en-IN')}</p>
                </div>

                <div
                  onClick={() => setShowBreakdownModal(true)}
                  className="bg-white/5 hover:bg-white/10 rounded-lg py-1.5 px-1.5 cursor-pointer transition-colors"
                >
                  <p className="text-[9px] text-teal-300 font-medium">Promo Credit</p>
                  <p className="text-xs font-bold text-teal-200 mt-0.5">₹{walletData.promoBalance.toLocaleString('en-IN')}</p>
                </div>

                <div
                  onClick={() => setShowBreakdownModal(true)}
                  className="bg-white/5 hover:bg-white/10 rounded-lg py-1.5 px-1.5 cursor-pointer transition-colors"
                >
                  <p className="text-[9px] text-amber-300 font-medium">Cashback</p>
                  <p className="text-xs font-bold text-amber-200 mt-0.5">₹{walletData.cashbackBalance.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* COMPACT REFERRAL BANNER                                        */}
          {/* ============================================================== */}
          <div
            onClick={() => navigate('/user/rewards')}
            className="group relative overflow-hidden rounded-xl p-2.5 sm:p-3 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 text-white shadow-xs cursor-pointer transition-all hover:shadow-md active:scale-[0.99] border border-violet-400/20"
          >
            <div className="relative z-10 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center text-base shrink-0 border border-white/10">
                  🎁
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-white tracking-tight truncate">
                      Refer friends & earn ₹100
                    </h3>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-yellow-400/20 text-yellow-300 border border-yellow-300/30">
                      ₹100
                    </span>
                  </div>
                  <p className="text-[10px] text-violet-100 truncate mt-0.5">
                    Both get ₹100 on their first completed service
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[10px] font-bold text-white transition-colors border border-white/10">
                <span>Invite</span>
                <FiChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* COMPACT STATS CARDS                                            */}
          {/* ============================================================== */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Total Spent */}
            <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-100 shadow-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <FiCreditCard className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <p className="text-slate-400 text-[9px] font-semibold truncate leading-none">Total Spent</p>
                  <p className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight truncate mt-0.5">
                    ₹{totalSpent.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-50 text-slate-400 border border-slate-100 shrink-0">
                All-time
              </span>
            </div>

            {/* Active Penalty */}
            <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-100 shadow-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                    walletData.penalty > 0
                      ? 'bg-orange-50 text-orange-600 border-orange-100'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  }`}
                >
                  {walletData.penalty > 0 ? (
                    <FiAlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
                  ) : (
                    <FiCheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-slate-400 text-[9px] font-semibold truncate leading-none">Active Penalty</p>
                  <p
                    className={`text-xs sm:text-sm font-extrabold tracking-tight truncate mt-0.5 ${
                      walletData.penalty > 0 ? 'text-orange-600' : 'text-slate-900'
                    }`}
                  >
                    ₹{walletData.penalty.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                  walletData.penalty > 0
                    ? 'bg-orange-50 text-orange-700 border-orange-100'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                }`}
              >
                {walletData.penalty > 0 ? 'Dues' : 'Clean'}
              </span>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SLIM WALLET PERKS STRIP                                        */}
          {/* ============================================================== */}
          <div className="bg-white rounded-xl py-2 px-3 border border-slate-100 shadow-xs flex items-center justify-around text-[10px] font-medium text-slate-500">
            <span className="flex items-center gap-1">
              <FiZap className="w-3 h-3 text-teal-600" />
              1-Tap Pay
            </span>
            <span className="text-slate-200">•</span>
            <span className="flex items-center gap-1">
              <FiShield className="w-3 h-3 text-emerald-600" />
              Fast Refunds
            </span>
            <span className="text-slate-200">•</span>
            <span className="flex items-center gap-1">
              <FiGift className="w-3 h-3 text-amber-600" />
              Cashback Perks
            </span>
          </div>

          {/* ============================================================== */}
          {/* TRANSACTIONS SECTION (Compact & Accessible)                    */}
          {/* ============================================================== */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Recent Transactions</h3>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                  {transactions.length}
                </span>
              </div>

              {/* Tabs: All / Credited / Debited */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold text-slate-600 shrink-0">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveTab('credit')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeTab === 'credit' ? 'bg-white text-emerald-700 shadow-xs' : 'hover:text-slate-900'
                  }`}
                >
                  + Added
                </button>
                <button
                  onClick={() => setActiveTab('debit')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeTab === 'debit' ? 'bg-white text-rose-700 shadow-xs' : 'hover:text-slate-900'
                  }`}
                >
                  - Spent
                </button>
              </div>
            </div>

            {/* Quick search bar if transactions > 5 */}
            {transactions.length > 5 && (
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-4 py-1.5 bg-white rounded-lg border border-slate-200/80 text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <FiX className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* List */}
            <div className="space-y-2">
              {loading ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-100 shadow-xs">
                  <LogoLoader fullScreen={false} />
                  <p className="text-[11px] font-semibold text-slate-500 mt-3">Loading transactions...</p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-10 px-4 bg-white rounded-xl border border-slate-100 shadow-xs">
                  <div className="w-10 h-10 mx-auto rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 mb-2 border border-slate-100">
                    <MdAccountBalanceWallet className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">No transactions found</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs mx-auto">
                    {searchQuery
                      ? 'No activity matches your search query.'
                      : activeTab !== 'all'
                      ? `No ${activeTab === 'credit' ? 'money added' : 'spent'} transactions yet.`
                      : 'Add money to your wallet to start enjoying 1-tap bookings and cashback.'}
                  </p>
                  {!searchQuery && activeTab === 'all' && (
                    <button
                      onClick={() => openAddMoneyModal()}
                      className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-[11px] font-bold shadow-xs hover:bg-teal-700 transition-all cursor-pointer"
                    >
                      <FiPlus className="w-3 h-3" />
                      Add Money Now
                    </button>
                  )}
                </div>
              ) : (
                filteredTransactions.map((item, index) => {
                  const date = new Date(item.date);
                  const formattedDate = date.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });
                  const formattedTime = date.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  const style = getTransactionVisuals(item.type);

                  return (
                    <motion.div
                      key={item.id || index}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.2) }}
                      className="flex items-center justify-between p-2.5 sm:p-3 bg-white border border-slate-100 rounded-xl shadow-xs hover:border-slate-200 transition-all"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.bg}`}>
                          {style.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {item.description || item.title || 'Transaction'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 flex-wrap">
                            <span className="flex items-center gap-1">
                              <FiClock className="w-2.5 h-2.5" />
                              {formattedDate} • {formattedTime}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded capitalize ${style.badgeBg}`}>
                              {style.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className={`text-xs sm:text-sm font-extrabold ${style.color}`}>
                          {style.sign}₹{Number(item.amount || 0).toLocaleString('en-IN')}
                        </p>
                        {item.balanceAfter !== undefined && (
                          <p className="text-[9px] font-semibold text-slate-400 mt-0.5">
                            Bal: ₹{Number(item.balanceAfter).toLocaleString('en-IN')}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ============================================================== */}
      {/* ADD MONEY BOTTOM SHEET / MODAL                                 */}
      {/* ============================================================== */}
      <AnimatePresence>
        {showAddMoneyModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !processingPayment && setShowAddMoneyModal(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: '100%', opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3 sm:hidden" />

              {/* Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                    <FiPlus className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 leading-tight">Add Money to Wallet</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Instant balance top-up</p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={processingPayment}
                  onClick={() => setShowAddMoneyModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                >
                  <FiX className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Current Available Balance Preview */}
              <div className="my-3 p-2.5 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500">Current Balance</span>
                <span className="text-xs font-extrabold text-slate-900">
                  ₹{walletData.totalAvailable.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Amount Input */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Enter Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-black text-slate-700">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="100"
                    max="50000"
                    step="50"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    disabled={processingPayment}
                    placeholder="500"
                    className="w-full pl-9 pr-8 py-2.5 text-xl font-black text-slate-900 bg-white rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 focus:outline-none transition-all"
                  />
                  {topupAmount && !processingPayment && (
                    <button
                      type="button"
                      onClick={() => setTopupAmount('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <FiX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] px-0.5">
                  <span className="text-slate-400">Min: ₹100 • Max: ₹50,000</span>
                  {Number(topupAmount) < 100 && topupAmount !== '' && (
                    <span className="text-rose-500 font-semibold">Min deposit is ₹100</span>
                  )}
                </div>
              </div>

              {/* Preset Chips */}
              <div className="mt-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Popular Amounts
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {PRESET_AMOUNTS.map((amt) => {
                    const isSelected = String(amt) === String(topupAmount);
                    return (
                      <button
                        key={amt}
                        type="button"
                        disabled={processingPayment}
                        onClick={() => setTopupAmount(String(amt))}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all border cursor-pointer active:scale-95 ${
                          isSelected
                            ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        +₹{amt.toLocaleString('en-IN')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payment Trust Badges */}
              <div className="mt-3.5 p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <div className="flex items-center gap-1 font-medium">
                  <MdLockOutline className="w-3.5 h-3.5 text-emerald-600" />
                  <span>256-bit Encrypted</span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-slate-700">
                  <span>Powered by</span>
                  <span className="text-blue-700 font-black">Razorpay</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-3.5">
                <button
                  type="button"
                  disabled={processingPayment || !topupAmount || Number(topupAmount) < 100}
                  onClick={handleProceedTopup}
                  className={`w-full py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer ${
                    processingPayment || !topupAmount || Number(topupAmount) < 100
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-teal-600/20 active:scale-[0.99]'
                  }`}
                >
                  {processingPayment ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <>
                      <FiPlus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>
                        Proceed to Add ₹{Number(topupAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[9px] text-center text-slate-400 mt-2">
                UPI (GPay, PhonePe, Paytm), Cards & Net Banking
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* BREAKDOWN EXPLAINER MODAL                                      */}
      {/* ============================================================== */}
      <AnimatePresence>
        {showBreakdownModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBreakdownModal(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xs bg-white rounded-2xl shadow-2xl p-4 z-10"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                    <FiInfo className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900">Wallet Breakdown</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBreakdownModal(false)}
                  className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
                >
                  <FiX className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mt-3 space-y-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                      Wallet Cash
                    </span>
                    <span className="text-xs font-black">₹{walletData.balance.toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-slate-500 mt-0.5 text-[10px] leading-relaxed">
                    Real deposited funds. 100% usable on any booking with no expiry.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-teal-50/60 border border-teal-100/60">
                  <div className="flex items-center justify-between font-bold text-teal-900">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                      Promo Credit
                    </span>
                    <span className="text-xs font-black">₹{walletData.promoBalance.toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-teal-700/80 mt-0.5 text-[10px] leading-relaxed">
                    Campaign promo credits. Automatically applied as discounts on bookings.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-100/60">
                  <div className="flex items-center justify-between font-bold text-amber-900">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      Cashback
                    </span>
                    <span className="text-xs font-black">₹{walletData.cashbackBalance.toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-amber-700/80 mt-0.5 text-[10px] leading-relaxed">
                    Rewards from bookings & referrals. Directly spendable on bookings.
                  </p>
                </div>

                {walletData.penalty > 0 && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-100">
                    <div className="flex items-center justify-between font-bold text-rose-900">
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <FiAlertTriangle className="w-3 h-3 text-rose-600" />
                        Active Penalty
                      </span>
                      <span className="text-xs font-black">-₹{walletData.penalty.toLocaleString('en-IN')}</span>
                    </div>
                    <p className="text-rose-700/80 mt-0.5 text-[10px] leading-relaxed">
                      Dues deducted from available balance.
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowBreakdownModal(false)}
                className="w-full mt-3.5 py-2 rounded-lg bg-slate-900 text-white font-bold text-[11px]"
              >
                Got It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Wallet;
