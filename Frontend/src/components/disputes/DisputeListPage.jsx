import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiAlertOctagon, FiChevronRight } from 'react-icons/fi';
import bookingFeaturesService from '../../services/bookingFeaturesService';
import { disputeStatusMeta, formatDateTime } from './disputeUi';

const TABS = [
  { key: 'active', label: 'Active' },
  { key: 'closed', label: 'Closed' },
  { key: '', label: 'All' }
];

/**
 * "My disputes" list, shared by the user and worker apps.
 */
const DisputeListPage = ({ role }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('active');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const base = role === 'worker' ? '/worker' : '/user';

  useEffect(() => {
    let active = true;
    bookingFeaturesService.listDisputes(role, tab ? { status: tab } : {})
      .then((res) => { if (active && res.success) setItems(res.data || []); })
      .catch(() => { if (active) setItems([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [role, tab]);

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-gray-100" aria-label="Back">
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">My Disputes</h1>
        </div>
        <div className="px-4 pb-3 flex gap-2">
          {TABS.map((t) => (
            <button
              type="button"
              key={t.key || 'all'}
              onClick={() => {
                if (t.key === tab) return;
                setLoading(true);
                setTab(t.key);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${tab === t.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-4 space-y-3">
        {loading ? (
          [0, 1, 2].map((i) => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />)
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <FiAlertOctagon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No disputes here</p>
            <p className="text-sm text-gray-400 mt-1">You can report a problem from a booking's details page.</p>
          </div>
        ) : (
          items.map((d) => {
            const meta = disputeStatusMeta(d.status);
            return (
              <button
                type="button"
                key={d._id}
                onClick={() => navigate(`${base}/disputes/${d._id}`)}
                className="w-full text-left bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">#{d.disputeNumber}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.className}`}>{meta.label}</span>
                  </div>
                  <p className="text-sm text-gray-700 truncate mt-0.5">{d.reason}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {d.bookingId?.serviceName || 'Booking'} · #{d.bookingId?.bookingNumber} · {formatDateTime(d.lastActivityAt || d.createdAt)}
                  </p>
                </div>
                <FiChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </button>
            );
          })
        )}
      </main>
    </div>
  );
};

export default DisputeListPage;
