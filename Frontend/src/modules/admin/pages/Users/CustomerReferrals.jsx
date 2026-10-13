import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiGift, FiLoader, FiSearch, FiCheck, FiX, FiSave } from 'react-icons/fi';
import bookingFeaturesAdminService from '../../services/bookingFeaturesAdminService';
import { PageHeader, Card, Toggle, Field, Button, StatusPill, EmptyState, Pagination } from '../../components/adminUi';
import { inputClass, money, formatDateTime } from '../../components/adminFormat';

const STATUS = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-sky-50 text-sky-700',
  rewarded: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-gray-100 text-gray-600'
};

/**
 * Customer-to-customer referral programme: settings, the list of referrals,
 * and manual approval when the programme requires it.
 */
const CustomerReferrals = () => {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], stats: {}, pagination: {} });
  const [settings, setSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingFeaturesAdminService.listUserReferrals({ status: status || undefined, search: search || undefined, page });
      if (res.success) {
        setResult(res);
        setSettings((prev) => prev || res.settings);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load referrals');
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => { load(); }, [load]);

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await bookingFeaturesAdminService.updateUserReferralSettings(settings);
      if (res.success) {
        setSettings(res.settings);
        toast.success('Referral settings saved');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Save failed');
    } finally {
      setSavingSettings(false);
    }
  };

  const act = async (r, action) => {
    setBusy(r._id);
    try {
      const res = action === 'approve'
        ? await bookingFeaturesAdminService.approveUserReferral(r._id)
        : await bookingFeaturesAdminService.rejectUserReferral(r._id);
      if (res.success) {
        toast.success(res.message);
        load();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  const stats = result.stats || {};
  const setS = (key) => (value) => setSettings((s) => ({ ...s, [key]: value }));

  return (
    <div className="p-4 sm:p-6">
      <PageHeader icon={FiGift} title="Customer Referrals" description="Customers earn wallet credit for inviting friends. Configure the programme and review referrals here." />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Pending', value: stats.pending || 0 },
          { label: 'Rewarded', value: stats.rewarded || 0 },
          { label: 'Rejected', value: stats.rejected || 0 },
          { label: 'Total paid', value: money(stats.totalPaid) }
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-gray-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {settings && (
        <Card title="Programme settings" className="mb-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/60 p-3 lg:col-span-1">
              <span className="text-sm font-semibold text-gray-900">Enabled</span>
              <Toggle checked={settings.userReferralEnabled} onChange={setS('userReferralEnabled')} />
            </div>
            <Field label="Reward to referrer (₹)"><input type="number" min="0" value={settings.userReferralReward} onChange={(e) => setS('userReferralReward')(e.target.value)} className={inputClass} /></Field>
            <Field label="Joining bonus for friend (₹)" hint="0 = none"><input type="number" min="0" value={settings.userRefereeReward} onChange={(e) => setS('userRefereeReward')(e.target.value)} className={inputClass} /></Field>
            <Field label="Pay reward">
              <select value={settings.userReferralCriteria} onChange={(e) => setS('userReferralCriteria')(e.target.value)} className={inputClass}>
                <option value="FIRST_BOOKING">After friend's first completed booking</option>
                <option value="ON_SIGNUP">Immediately on signup</option>
                <option value="MANUAL_ADMIN_APPROVAL">After admin approval</option>
              </select>
            </Field>
            <Field label="Max rewards per customer" hint="0 = unlimited"><input type="number" min="0" value={settings.userReferralMaxPerUser} onChange={(e) => setS('userReferralMaxPerUser')(e.target.value)} className={inputClass} /></Field>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={saveSettings} disabled={savingSettings}><FiSave /> {savingSettings ? 'Saving…' : 'Save settings'}</Button>
          </div>
        </Card>
      )}

      <Card title="Referrals">
        <div className="mb-4 flex flex-wrap gap-2">
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={`${inputClass} w-40`}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="rewarded">Rewarded</option>
            <option value="rejected">Rejected</option>
          </select>
          <form onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); setPage(1); }} className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone or code" className={`${inputClass} w-60 pl-9`} />
          </form>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center"><FiLoader className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : result.data.length === 0 ? (
          <EmptyState icon={FiGift} title="No referrals yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4">Referrer</th>
                  <th className="py-2 pr-4">New customer</th>
                  <th className="py-2 pr-4">Code</th>
                  <th className="py-2 pr-4">Reward</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Joined</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((r) => (
                  <tr key={r._id} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 pr-4"><p className="font-semibold text-gray-900">{r.referrerId?.name}</p><p className="text-xs text-gray-500">{r.referrerId?.phone}</p></td>
                    <td className="py-3 pr-4"><p className="text-gray-900">{r.referredUserId?.name}</p><p className="text-xs text-gray-500">{r.referredUserId?.phone}</p></td>
                    <td className="py-3 pr-4 font-mono text-xs">{r.referralCode}</td>
                    <td className="py-3 pr-4">{money(r.rewardAmount)}{r.refereeRewardAmount > 0 ? <span className="text-xs text-gray-500"> + {money(r.refereeRewardAmount)}</span> : null}</td>
                    <td className="py-3 pr-4"><StatusPill className={STATUS[r.status]}>{r.status}</StatusPill></td>
                    <td className="py-3 pr-4 text-xs text-gray-500">{formatDateTime(r.createdAt)}</td>
                    <td className="py-3 text-right">
                      {['pending', 'approved'].includes(r.status) && (
                        <div className="inline-flex gap-1">
                          <Button variant="ghost" className="px-2 text-emerald-700" disabled={busy === r._id} onClick={() => act(r, 'approve')} aria-label="Approve and pay"><FiCheck /></Button>
                          <Button variant="ghost" className="px-2 text-red-600" disabled={busy === r._id} onClick={() => act(r, 'reject')} aria-label="Reject"><FiX /></Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={result.pagination?.page || 1} pages={result.pagination?.pages} onChange={setPage} />
      </Card>
    </div>
  );
};

export default CustomerReferrals;
