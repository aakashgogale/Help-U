import React, { useEffect, useLayoutEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiCheckCircle, FiCreditCard, FiInfo, FiArrowRight } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import Header from '../../components/layout/Header';
import { workerTheme as themeColors } from '../../../../theme';
import workerWalletService from '../../../../services/workerWalletService';

const ensureRazorpayLoaded = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
    if (existing) {
      if (window.Razorpay) return resolve(true);
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      setTimeout(() => resolve(!!window.Razorpay), 1500);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const SettlementRequest = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [wallet, setWallet] = useState({ amountDue: 0, dues: 0, totalCashCollected: 0, totalSettled: 0, cashLimit: 10000 });
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const bgStyle = themeColors.backgroundGradient;

    if (html) html.style.background = bgStyle;
    if (body) body.style.background = bgStyle;
    if (root) root.style.background = bgStyle;

    return () => {
      if (html) html.style.background = '';
      if (body) body.style.background = '';
      if (root) root.style.background = '';
    };
  }, []);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    try {
      setLoading(true);
      const res = await workerWalletService.getWallet();
      if (res.success) {
        const data = res.data || {};
        setWallet(data);
        const due = Number(data.amountDue ?? data.dues ?? 0);
        setAmount(due > 0 ? String(due) : '');
      }
    } catch (error) {
      console.error('Load wallet error:', error);
      toast.error('Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async () => {
    const maxDue = Number(wallet.amountDue ?? wallet.dues ?? 0);
    const settlementAmount = Number(amount);

    if (!Number.isFinite(settlementAmount) || settlementAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (settlementAmount > maxDue) {
      toast.error(`Amount cannot exceed ₹${maxDue.toLocaleString('en-IN')}`);
      return;
    }

    const isLoaded = await ensureRazorpayLoaded();
    if (!isLoaded || !window.Razorpay) {
      toast.error('Unable to load payment gateway. Please check your internet connection.');
      return;
    }

    try {
      setSubmitting(true);
      const orderRes = await workerWalletService.createSettlementOrder(settlementAmount);

      if (!orderRes.success) {
        toast.error(orderRes.message || 'Failed to create settlement order');
        setSubmitting(false);
        return;
      }

      const orderData = orderRes.data;

      const razorpay = new window.Razorpay({
        key: orderData.key,
        amount: Math.round(Number(orderData.amount) * 100),
        currency: orderData.currency || 'INR',
        name: 'Help U Admin Settlement',
        description: 'Service Partner settlement payment',
        order_id: orderData.orderId,
        prefill: {},
        theme: { color: themeColors.button },
        handler: async (response) => {
          try {
            const verifyRes = await workerWalletService.verifySettlementPayment({
              amount: settlementAmount,
              notes,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyRes.success) {
              toast.success('Settlement completed successfully');
              navigate('/worker/wallet');
              return;
            }

            toast.error(verifyRes.message || 'Payment verification failed');
          } catch (error) {
            console.error('Settlement verification error:', error);
            toast.error(error.response?.data?.message || 'Failed to verify settlement payment');
          } finally {
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
          }
        }
      });

      razorpay.open();
    } catch (error) {
      console.error('Settlement order error:', error);
      toast.error(error.response?.data?.message || 'Failed to start settlement payment');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: themeColors.backgroundGradient }}>
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${themeColors.button} transparent ${themeColors.button} ${themeColors.button}` }} />
      </div>
    );
  }

  const maxDue = Number(wallet.amountDue ?? wallet.dues ?? 0);

  return (
    <div className="min-h-screen pb-24" style={{ background: themeColors.backgroundGradient }}>
      <Header title="Pay to Admin" showBack={true} onBack={() => navigate('/worker/wallet')} />

      <main className="px-4 py-6">
        {maxDue <= 0 ? (
          /* Zero Dues All Clear State */
          <div className="space-y-5">
            <div
              className="rounded-3xl p-6 text-white shadow-xl relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                boxShadow: '0 18px 40px rgba(5, 150, 105, 0.24)'
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-sm text-white">
                  <FiCheckCircle className="w-3.5 h-3.5" />
                  All Clear
                </span>
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <FiCheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-white/80 text-sm mb-1 font-medium">Current Amount Due to Admin</p>
              <p className="text-4xl font-black mb-2">₹0</p>
              <p className="text-xs text-white/80 leading-relaxed">
                You have no outstanding platform commissions or settlement dues pending.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100 space-y-4">
              <h3 className="font-bold text-gray-900 text-sm">Settlement Summary</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-red-50/60 rounded-2xl border border-red-100">
                  <p className="text-xs text-gray-600 font-medium mb-1">Cash Collected</p>
                  <p className="text-lg font-bold text-red-600">₹{Number(wallet.totalCashCollected || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                  <p className="text-xs text-gray-600 font-medium mb-1">Total Settled</p>
                  <p className="text-lg font-bold text-emerald-600">₹{Number(wallet.totalSettled || 0).toLocaleString('en-IN')}</p>
                </div>
              </div>

              <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-900 font-bold">Cash Collection Limit</p>
                  <p className="text-xs text-blue-700 mt-0.5">₹{Number(wallet.cashLimit || 10000).toLocaleString('en-IN')}</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-white text-blue-700 rounded-full shadow-xs border border-blue-100">
                  Healthy
                </span>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 flex gap-3 text-xs text-slate-600 leading-relaxed">
                <FiInfo className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                <p>
                  When you complete cash-on-delivery bookings, admin commissions or cash collections are added to your dues. When dues are generated, you can settle them online here via UPI, card, or net banking.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => navigate('/worker/wallet/settlements')}
                className="w-full py-3.5 bg-white border border-gray-200 text-gray-800 font-bold rounded-2xl shadow-sm hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>View Settlement History</span>
                <FiArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => navigate('/worker/wallet')}
                className="w-full py-3.5 text-white font-bold rounded-2xl shadow-md active:scale-95 transition-all text-center"
                style={{
                  background: themeColors.button,
                  boxShadow: `0 4px 12px ${themeColors.button}40`
                }}
              >
                Back to Wallet
              </button>
            </div>
          </div>
        ) : (
          /* Active Dues Settlement Form */
          <>
            <div
              className="rounded-3xl p-5 mb-6 text-white shadow-xl"
              style={{
                background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                boxShadow: '0 18px 40px rgba(220, 38, 38, 0.24)'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/75 text-sm font-medium">Current Amount Due</p>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 backdrop-blur-sm text-white">
                  Payment Due
                </span>
              </div>
              <p className="text-4xl font-black">₹{maxDue.toLocaleString('en-IN')}</p>
              <p className="text-xs text-white/80 mt-2">This payment is settled instantly after Razorpay verification.</p>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-lg border border-white/70 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Settlement Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                  <input
                    type="number"
                    min="1"
                    max={maxDue}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-2xl border border-gray-200 focus:border-blue-400 focus:outline-none font-semibold text-gray-900"
                    placeholder="Enter amount"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                  <span>Max payable now: ₹{maxDue.toLocaleString('en-IN')}</span>
                  {amount !== String(maxDue) && (
                    <button
                      type="button"
                      onClick={() => setAmount(String(maxDue))}
                      className="text-blue-600 font-bold hover:underline"
                    >
                      Pay Full (₹{maxDue.toLocaleString('en-IN')})
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 rounded-2xl border border-gray-200 focus:border-blue-400 focus:outline-none resize-none"
                  placeholder="Optional note for this settlement"
                />
              </div>

              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 flex gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <FiCheckCircle className="w-5 h-5" />
                </div>
                <div className="text-sm">
                  <p className="font-bold text-emerald-900">Automated settlement</p>
                  <p className="text-emerald-700 text-xs mt-1">No admin approval is needed. Once payment succeeds, dues reduce automatically and admins are notified instantly.</p>
                </div>
              </div>

              <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 flex gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <FiAlertCircle className="w-5 h-5" />
                </div>
                <div className="text-sm">
                  <p className="font-bold text-amber-900">Payment mode</p>
                  <p className="text-amber-700 text-xs mt-1">Razorpay will let you pay using UPI, card, net banking, or supported methods directly to admin settlement flow.</p>
                </div>
              </div>
            </div>

            <button
              onClick={handlePayNow}
              disabled={submitting || maxDue <= 0}
              className="w-full mt-6 py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              style={{
                background: themeColors.button,
                boxShadow: `0 4px 12px ${themeColors.button}40`
              }}
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FiCreditCard className="w-5 h-5" />
                  Pay ₹{Number(amount || maxDue).toLocaleString('en-IN')} with Razorpay
                </>
              )}
            </button>
          </>
        )}
      </main>
    </div>
  );
};

export default SettlementRequest;
