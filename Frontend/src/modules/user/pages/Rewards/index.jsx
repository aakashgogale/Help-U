import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FiCopy, FiArrowLeft, FiGift, FiShare2, FiUsers, FiCheckCircle, FiClock } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { themeColors } from '../../../../theme';
import bookingFeaturesService from '../../../../services/bookingFeaturesService';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const CRITERIA_TEXT = {
  ON_SIGNUP: 'as soon as they sign up',
  FIRST_BOOKING: 'when they complete their first booking',
  MANUAL_ADMIN_APPROVAL: 'once our team approves the referral'
};

const STATUS_BADGE = {
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700' },
  approved: { label: 'Approved', className: 'bg-sky-50 text-sky-700' },
  rewarded: { label: 'Rewarded', className: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: 'Not eligible', className: 'bg-gray-100 text-gray-500' }
};

/**
 * Refer & Earn: the customer's code, earnings and referred friends, using the
 * referral programme configured by the admin.
 */
const Rewards = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      bookingFeaturesService.getReferralStats(),
      bookingFeaturesService.getReferralHistory({ limit: 50 })
    ])
      .then(([s, h]) => {
        if (s.success) setStats(s.stats);
        if (h.success) setHistory(h.items || []);
      })
      .catch(() => toast.error('Failed to load referral details'))
      .finally(() => setLoading(false));
  }, []);

  const code = stats?.referralCode || '';
  const link = code ? `${window.location.origin}/user/signup?ref=${encodeURIComponent(code)}` : '';
  const shareText = stats
    ? `Use my code ${code} to sign up on Help U${stats.joiningBonus > 0 ? ` and get ${money(stats.joiningBonus)} in your wallet` : ''}! ${link}`
    : '';

  const copy = (value, label) => {
    navigator.clipboard.writeText(value)
      .then(() => toast.success(`${label} copied`))
      .catch(() => toast.error('Could not copy'));
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Help U', text: shareText, url: link });
      } catch {
        // User dismissed the share sheet.
      }
    } else {
      copy(shareText, 'Invite message');
    }
  };

  return (
    <div className="min-h-screen pb-10" style={{ background: themeColors.backgroundGradient }}>
      <div className="bg-white sticky top-0 z-50 border-b border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-50 rounded-full transition-colors" aria-label="Back">
          <FiArrowLeft className="w-5 h-5 text-gray-800" />
        </button>
        <FiGift className="w-5 h-5" style={{ color: themeColors.button }} />
        <h1 className="text-lg font-bold text-gray-900">Refer & Earn</h1>
      </div>

      <main className="px-4 py-5 space-y-4">
        {loading ? (
          <>
            <div className="h-48 bg-white rounded-3xl animate-pulse" />
            <div className="h-24 bg-white rounded-3xl animate-pulse" />
          </>
        ) : !stats?.isEnabled ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-gray-100">
            <FiGift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-bold text-gray-800">Referral programme is paused</p>
            <p className="text-sm text-gray-500 mt-1">Check back soon for new rewards.</p>
          </div>
        ) : (
          <>
            {/* Hero */}
            <section className="rounded-3xl p-6 text-white relative overflow-hidden" style={{ background: themeColors.headerGradient }}>
              <p className="text-sm font-medium text-white/80">Invite friends, earn</p>
              <p className="text-4xl font-black mt-1">{money(stats.rewardPerReferral)}</p>
              <p className="text-sm text-white/80 mt-1">
                for each friend, credited to your wallet {CRITERIA_TEXT[stats.criteria] || ''}.
                {stats.joiningBonus > 0 && ` Your friend gets ${money(stats.joiningBonus)} too.`}
              </p>

              <div className="mt-5 bg-white/10 border border-white/20 rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/70">Your code</p>
                  <p className="text-xl font-black tracking-widest">{code || '—'}</p>
                </div>
                {code && (
                  <button type="button" onClick={() => copy(code, 'Code')} className="p-2.5 rounded-xl bg-white/15 hover:bg-white/25" aria-label="Copy code">
                    <FiCopy className="w-5 h-5" />
                  </button>
                )}
              </div>

              {code && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')}
                    className="py-3 rounded-xl bg-[#25D366] text-white font-bold text-sm flex items-center justify-center gap-2">
                    <FaWhatsapp className="w-4 h-4" /> WhatsApp
                  </button>
                  <button type="button" onClick={share}
                    className="py-3 rounded-xl bg-white text-gray-900 font-bold text-sm flex items-center justify-center gap-2">
                    <FiShare2 className="w-4 h-4" /> Share
                  </button>
                </div>
              )}
            </section>

            {/* Stats */}
            <section className="grid grid-cols-3 gap-3">
              {[
                { label: 'Earned', value: money(stats.totalEarnings), icon: FiGift },
                { label: 'Rewarded', value: stats.rewardedReferrals, icon: FiCheckCircle },
                { label: 'Pending', value: stats.pendingReferrals, icon: FiClock }
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
                  <Icon className="w-4 h-4 mx-auto text-gray-400" />
                  <p className="text-lg font-black text-gray-900 mt-1">{value}</p>
                  <p className="text-[11px] text-gray-500">{label}</p>
                </div>
              ))}
            </section>

            {/* How it works */}
            <section className="bg-white rounded-3xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-3">How it works</h3>
              <ol className="space-y-3">
                {[
                  'Share your code or link with friends.',
                  'They sign up on Help U using your code.',
                  `You get ${money(stats.rewardPerReferral)} ${CRITERIA_TEXT[stats.criteria] || ''}.`
                ].map((step, i) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0" style={{ backgroundColor: themeColors.button }}>{i + 1}</span>
                    <span className="text-sm text-gray-700">{step}</span>
                  </li>
                ))}
              </ol>
            </section>

            {/* History */}
            <section className="bg-white rounded-3xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <FiUsers className="w-4 h-4 text-gray-500" />
                <h3 className="font-bold text-gray-900">Your referrals ({stats.totalReferrals})</h3>
              </div>
              {history.length === 0 ? (
                <p className="text-sm text-gray-500">No one has joined with your code yet.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {history.map((r) => {
                    const badge = STATUS_BADGE[r.status] || STATUS_BADGE.pending;
                    return (
                      <div key={r.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                          <p className="text-[11px] text-gray-400">{r.phone} · joined {new Date(r.joinedAt).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.className}`}>{badge.label}</span>
                          {r.status === 'rewarded' && <p className="text-xs font-bold text-emerald-600 mt-0.5">+{money(r.rewardAmount)}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Rewards;
