import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiMessageSquare, FiLoader, FiMail, FiPhone, FiSave } from 'react-icons/fi';
import api from '../../../../services/api';
import { PageHeader, Card, Button, StatusPill, EmptyState, Pagination } from '../../components/adminUi';
import { inputClass, formatDateTime } from '../../components/adminFormat';

const TABS = [
  { key: '', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'resolved', label: 'Resolved' }
];
const STATUS_STYLE = {
  new: 'bg-amber-50 text-amber-700',
  in_progress: 'bg-blue-50 text-blue-700',
  resolved: 'bg-green-50 text-green-700'
};
const STATUS_LABEL = { new: 'New', in_progress: 'In progress', resolved: 'Resolved' };
const SOURCE_LABEL = { help_support: 'Customer app', landing: 'Landing page' };

const MessageCard = ({ message, onChanged }) => {
  const [note, setNote] = useState(message.adminNote || '');
  const [saving, setSaving] = useState(false);

  const update = async (patch, okText) => {
    setSaving(true);
    try {
      const res = await api.put(`/admin/support-messages/${message._id}`, patch);
      if (res.data.success) {
        toast.success(okText);
        onChanged(res.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900">{message.subject || '(no subject)'}</p>
          <p className="text-xs text-gray-500">
            {message.name}
            {message.userId?.name ? ` · account: ${message.userId.name}` : ''} · {SOURCE_LABEL[message.source] || message.source} · {formatDateTime(message.createdAt)}
          </p>
        </div>
        <StatusPill className={STATUS_STYLE[message.status]}>{STATUS_LABEL[message.status]}</StatusPill>
      </div>

      <p className="mt-3 whitespace-pre-line break-words text-sm text-gray-800">{message.message}</p>

      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        {message.email && <a href={`mailto:${message.email}`} className="inline-flex items-center gap-1 font-semibold text-sky-700"><FiMail /> {message.email}</a>}
        {message.phone && <a href={`tel:${message.phone}`} className="inline-flex items-center gap-1 font-semibold text-sky-700"><FiPhone /> {message.phone}</a>}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          className={inputClass}
          value={note}
          maxLength={1000}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Internal note (customers never see it)"
        />
        <Button variant="secondary" disabled={saving || note === (message.adminNote || '')} onClick={() => update({ adminNote: note }, 'Note saved')}>
          <FiSave /> Save note
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {['new', 'in_progress', 'resolved'].filter((s) => s !== message.status).map((s) => (
          <Button key={s} variant="secondary" disabled={saving} onClick={() => update({ status: s }, `Marked ${STATUS_LABEL[s].toLowerCase()}`)}>
            Mark {STATUS_LABEL[s].toLowerCase()}
          </Button>
        ))}
      </div>
    </div>
  );
};

/** Messages sent from the customer app's Help & Support and the landing page contact form. */
const SupportMessages = () => {
  const [status, setStatus] = useState('new');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], counts: {}, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/support-messages', { params: { status: status || undefined, page, limit: 20 } });
      if (res.data.success) {
        setData({ items: res.data.data || [], counts: res.data.counts || {}, pages: res.data.pagination?.pages || 1 });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load messages');
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    let active = true;
    load().finally(() => { if (!active) return; });
    return () => { active = false; };
  }, [load, version]);

  const total = Object.values(data.counts).reduce((a, b) => a + b, 0);
  const countOf = (key) => (key === '' ? total : data.counts[key] || 0);

  return (
    <div className="p-4 sm:p-6">
      <PageHeader icon={FiMessageSquare} title="Support Messages" description="Messages from the customer app’s Help & Support and the landing page contact form." />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key || 'all'}
            type="button"
            onClick={() => { setLoading(true); setPage(1); setStatus(t.key); }}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${status === t.key ? 'border-[#163B66] bg-[#163B66] text-white' : 'border-gray-300 bg-white text-gray-600'}`}
          >
            {t.label} <span className="ml-1 text-xs opacity-80">{countOf(t.key)}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><FiLoader className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : data.items.length === 0 ? (
        <Card><EmptyState icon={FiMessageSquare} title="No messages here" description="New messages from customers and visitors appear here." /></Card>
      ) : (
        <div className="space-y-3">
          {data.items.map((m) => (
            <MessageCard
              key={m._id}
              message={m}
              onChanged={() => setVersion((v) => v + 1)}
            />
          ))}
          <Pagination page={page} pages={data.pages} onChange={(p) => { setLoading(true); setPage(p); }} />
        </div>
      )}
    </div>
  );
};

export default SupportMessages;
