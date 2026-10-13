import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FiAlertOctagon, FiLoader, FiSearch, FiChevronRight } from 'react-icons/fi';
import bookingFeaturesAdminService from '../../services/bookingFeaturesAdminService';
import { PageHeader, Card, StatusPill, EmptyState, Pagination } from '../../components/adminUi';
import { inputClass, formatDateTime } from '../../components/adminFormat';
import { disputeStatusMeta } from '../../../../components/disputes/disputeUi';

const STATUS_TABS = [
  { key: 'active', label: 'Active' },
  { key: 'open', label: 'Open' },
  { key: 'under_review', label: 'Under review' },
  { key: 'awaiting_response', label: 'Awaiting reply' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'rejected', label: 'Rejected' },
  { key: '', label: 'All' }
];

const PRIORITY = {
  high: 'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-gray-100 text-gray-600'
};

const Disputes = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('active');
  const [priority, setPriority] = useState('');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], stats: {}, pagination: {} });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingFeaturesAdminService.listDisputes({ status: status || undefined, priority: priority || undefined, q: query || undefined, page });
      if (res.success) setResult(res);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  }, [status, priority, query, page]);

  useEffect(() => { load(); }, [load]);

  const stats = result.stats || {};
  const activeCount = (stats.open || 0) + (stats.under_review || 0) + (stats.awaiting_response || 0);

  return (
    <div className="p-4 sm:p-6">
      <PageHeader icon={FiAlertOctagon} title="Disputes" description="Complaints raised by customers and professionals. Review evidence, talk to both sides and resolve with a refund or penalty." />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Active', value: activeCount, tone: 'text-amber-600' },
          { label: 'Open', value: stats.open || 0, tone: 'text-gray-900' },
          { label: 'Resolved', value: stats.resolved || 0, tone: 'text-emerald-600' },
          { label: 'Rejected', value: stats.rejected || 0, tone: 'text-gray-500' }
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-gray-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <Card>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((t) => (
              <button key={t.key || 'all'} type="button" onClick={() => { setStatus(t.key); setPage(1); }}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${status === t.key ? 'border-[#163B66] bg-[#163B66] text-white' : 'border-gray-300 bg-white text-gray-600'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }} className={`${inputClass} w-36`}>
              <option value="">All priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <form onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); setPage(1); }} className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Dispute or booking no." className={`${inputClass} w-56 pl-9`} />
            </form>
          </div>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center"><FiLoader className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : result.data.length === 0 ? (
          <EmptyState icon={FiAlertOctagon} title="No disputes" description="Nothing matches these filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4">Dispute</th>
                  <th className="py-2 pr-4">Booking</th>
                  <th className="py-2 pr-4">Raised by</th>
                  <th className="py-2 pr-4">Priority</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Last activity</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {result.data.map((d) => {
                  const meta = disputeStatusMeta(d.status);
                  return (
                    <tr key={d._id} onClick={() => navigate(`/admin/disputes/${d._id}`)} className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-gray-900">#{d.disputeNumber}</p>
                        <p className="max-w-[220px] truncate text-xs text-gray-500">{d.reason}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="text-gray-900">{d.bookingId?.serviceName}</p>
                        <p className="text-xs text-gray-500">#{d.bookingId?.bookingNumber}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="capitalize text-gray-900">{d.raisedBy === 'user' ? 'Customer' : 'Professional'}</p>
                        <p className="text-xs text-gray-500">{d.raisedBy === 'user' ? d.userId?.name : (d.workerId?.businessName || d.workerId?.name)}</p>
                      </td>
                      <td className="py-3 pr-4"><StatusPill className={PRIORITY[d.priority]}>{d.priority}</StatusPill></td>
                      <td className="py-3 pr-4"><span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>{meta.label.replace('your ', '')}</span></td>
                      <td className="py-3 pr-4 text-xs text-gray-500">{formatDateTime(d.lastActivityAt)}</td>
                      <td className="py-3 text-right"><FiChevronRight className="inline text-gray-400" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={result.pagination?.page || 1} pages={result.pagination?.pages} onChange={setPage} />
      </Card>
    </div>
  );
};

export default Disputes;
