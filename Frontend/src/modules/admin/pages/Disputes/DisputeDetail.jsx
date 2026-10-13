import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FiArrowLeft, FiLoader, FiSend, FiLock, FiMessageCircle, FiCheckCircle } from 'react-icons/fi';
import bookingFeaturesAdminService from '../../services/bookingFeaturesAdminService';
import { Card, Field, Button, StatusPill, Toggle } from '../../components/adminUi';
import { inputClass, money, formatDateTime } from '../../components/adminFormat';
import { disputeStatusMeta, ACTIVE_DISPUTE_STATUSES } from '../../../../components/disputes/disputeUi';
import IssueMediaGallery from '../../../../components/booking/IssueMediaGallery';
import BookingTimeline from '../../../../components/booking/BookingTimeline';
import BookingExtrasCard from '../../../../components/booking/BookingExtrasCard';

const SENDER = { user: 'Customer', worker: 'Professional', admin: 'Support', system: 'System' };
const OUTCOMES = [
  { key: 'favour_user', label: 'In favour of customer' },
  { key: 'partial', label: 'Partially' },
  { key: 'favour_worker', label: 'In favour of professional' },
  { key: 'no_action', label: 'No action needed' }
];

const mediaOf = (items = []) => ({
  photos: items.filter((a) => a.type !== 'video').map((a) => a.url),
  videos: items.filter((a) => a.type === 'video').map((a) => a.url)
});

const DisputeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [resolution, setResolution] = useState({ decision: 'resolved', outcome: 'favour_user', refundAmount: '', refundMethod: 'wallet', workerPenalty: '', note: '' });
  const [resolving, setResolving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await bookingFeaturesAdminService.getDispute(id);
      if (res.success) setDispute(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load dispute');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const send = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await bookingFeaturesAdminService.postDisputeMessage(id, { message: reply.trim(), isInternal: internal });
      if (res.success) {
        setReply('');
        load();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const updateCase = async (patch) => {
    try {
      const res = await bookingFeaturesAdminService.updateDispute(id, patch);
      if (res.success) {
        toast.success('Updated');
        load();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Update failed');
    }
  };

  const resolve = async () => {
    const refund = Number(resolution.refundAmount) || 0;
    const penalty = Number(resolution.workerPenalty) || 0;
    const summary = resolution.decision === 'rejected'
      ? 'Close this dispute without any refund or penalty?'
      : `Resolve with ${refund > 0 ? `a ${money(refund)} refund (${resolution.refundMethod === 'wallet' ? 'wallet' : 'original payment'})` : 'no refund'}${penalty > 0 ? ` and a ${money(penalty)} penalty on the professional` : ''}? This cannot be undone.`;
    if (!window.confirm(summary)) return;

    setResolving(true);
    try {
      const res = await bookingFeaturesAdminService.resolveDispute(id, {
        decision: resolution.decision,
        outcome: resolution.decision === 'rejected' ? 'no_action' : resolution.outcome,
        refundAmount: resolution.decision === 'rejected' ? 0 : refund,
        refundMethod: resolution.refundMethod,
        workerPenalty: resolution.decision === 'rejected' ? 0 : penalty,
        note: resolution.note
      });
      if (res.success) {
        toast.success('Dispute closed');
        load();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not resolve');
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><FiLoader className="h-6 w-6 animate-spin text-gray-400" /></div>;
  }
  if (!dispute) {
    return <div className="p-6 text-gray-600">Dispute not found. <button className="font-semibold text-sky-700" onClick={() => navigate('/admin/disputes')}>Back</button></div>;
  }

  const booking = dispute.bookingId || {};
  const meta = disputeStatusMeta(dispute.status);
  const isActive = ACTIVE_DISPUTE_STATUSES.includes(dispute.status);
  const evidence = mediaOf(dispute.evidence);
  const worker = dispute.workerId;
  const res = dispute.resolution || {};

  return (
    <div className="p-4 sm:p-6">
      <button type="button" onClick={() => navigate('/admin/disputes')} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-gray-900">
        <FiArrowLeft /> All disputes
      </button>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispute #{dispute.disputeNumber}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {dispute.reason} · raised by {dispute.raisedBy === 'user' ? 'customer' : 'professional'} on {formatDateTime(dispute.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${meta.className}`}>{meta.label.replace('your ', '')}</span>
          {isActive && (
            <>
              <select value={dispute.status} onChange={(e) => updateCase({ status: e.target.value })} className={`${inputClass} w-44`}>
                <option value="open">Open</option>
                <option value="under_review">Under review</option>
                <option value="awaiting_response">Awaiting reply</option>
              </select>
              <select value={dispute.priority} onChange={(e) => updateCase({ priority: e.target.value })} className={`${inputClass} w-32`}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: complaint + thread */}
        <div className="space-y-6 lg:col-span-2">
          <Card title="Complaint">
            <p className="whitespace-pre-line text-sm text-gray-800">{dispute.description}</p>
            {dispute.requestedRefund > 0 && <p className="mt-2 text-sm text-gray-600">Refund requested: <b>{money(dispute.requestedRefund)}</b></p>}
            {(evidence.photos.length + evidence.videos.length) > 0 && (
              <IssueMediaGallery className="mt-3" title="Evidence" photos={evidence.photos} videos={evidence.videos} />
            )}
          </Card>

          <Card title="Conversation" right={
            <button type="button" onClick={() => setShowChat((v) => !v)} className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700">
              <FiMessageCircle /> {showChat ? 'Hide' : 'Show'} booking chat ({dispute.chat?.length || 0})
            </button>
          }>
            {showChat && (
              <div className="mb-4 max-h-72 space-y-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
                {(dispute.chat || []).length === 0 && <p className="text-xs text-gray-500">No chat messages on this booking.</p>}
                {(dispute.chat || []).map((m) => (
                  <div key={m._id} className="text-xs">
                    <span className="font-semibold text-gray-700">{SENDER[m.senderType]}</span>
                    <span className="ml-2 text-gray-400">{formatDateTime(m.createdAt)}</span>
                    {m.message && <p className="text-gray-800">{m.message}</p>}
                    {m.attachments?.map((a) => <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="text-sky-700 underline">Photo</a>)}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {(dispute.messages || []).map((m) => {
                const media = mediaOf(m.attachments);
                if (m.senderType === 'system') {
                  return <p key={m._id} className="rounded-lg bg-gray-100 px-3 py-2 text-center text-xs text-gray-600">{m.message}</p>;
                }
                return (
                  <div key={m._id} className={`rounded-lg border p-3 ${m.isInternal ? 'border-amber-200 bg-amber-50' : m.senderType === 'admin' ? 'border-sky-100 bg-sky-50' : 'border-gray-200 bg-white'}`}>
                    <div className="mb-1 flex items-center gap-2 text-xs">
                      <span className="font-semibold text-gray-800">{m.senderName || SENDER[m.senderType]}</span>
                      <StatusPill>{SENDER[m.senderType]}</StatusPill>
                      {m.isInternal && <StatusPill className="bg-amber-100 text-amber-800"><FiLock className="mr-1" /> Internal</StatusPill>}
                      <span className="ml-auto text-gray-400">{formatDateTime(m.createdAt)}</span>
                    </div>
                    {m.message && <p className="whitespace-pre-line text-sm text-gray-800">{m.message}</p>}
                    {(media.photos.length + media.videos.length) > 0 && <IssueMediaGallery className="mt-2" size="sm" title="Attachments" photos={media.photos} videos={media.videos} />}
                  </div>
                );
              })}
            </div>

            {isActive && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <textarea value={reply} onChange={(e) => setReply(e.target.value.slice(0, 2000))} rows={3}
                  placeholder={internal ? 'Internal note (not visible to customer or professional)' : 'Reply to both parties'} className={inputClass} />
                <div className="mt-2 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-700"><Toggle checked={internal} onChange={setInternal} /> Internal note</label>
                  <Button onClick={send} disabled={sending || !reply.trim()}><FiSend /> {internal ? 'Add note' : 'Send reply'}</Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right: parties, booking, resolution */}
        <div className="space-y-6">
          <Card title="Parties">
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">Customer</p>
                <p className="font-semibold text-gray-900">{dispute.userId?.name}</p>
                <p className="text-gray-600">{dispute.userId?.phone}</p>
                <p className="text-xs text-gray-500">Wallet: {money(dispute.userId?.wallet?.balance)}</p>
              </div>
              {worker && (
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">Professional</p>
                  <p className="font-semibold text-gray-900">{worker.businessName || worker.name}</p>
                  <p className="text-gray-600">{worker.phone}</p>
                  <p className="text-xs text-gray-500">Rating {worker.rating || 0}★ · Earnings balance {money(worker.wallet?.earnings)}</p>
                </div>
              )}
            </div>
          </Card>

          <Card title="Booking">
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-gray-900">{booking.serviceName}</p>
              <p className="text-gray-600">#{booking.bookingNumber} · {booking.status}</p>
              <p className="text-gray-600">Scheduled {formatDateTime(booking.scheduledDate)}</p>
              <p className="text-gray-600">Amount {money(booking.finalAmount)} · Payment {booking.paymentStatus}</p>
              <p className="text-gray-600">Paid at dispute: {money(dispute.amountPaid)} · Already refunded {money(booking.refundedAmount)}</p>
            </div>
          </Card>

          <BookingExtrasCard booking={booking} title="Customer requests" />
          <BookingTimeline booking={booking} title="Booking timeline" />

          {isActive ? (
            <Card title="Resolve">
              <div className="space-y-3">
                <div className="flex gap-2">
                  {[{ k: 'resolved', l: 'Resolve' }, { k: 'rejected', l: 'Reject' }].map((o) => (
                    <button key={o.k} type="button" onClick={() => setResolution((r) => ({ ...r, decision: o.k }))}
                      className={`flex-1 rounded-lg border py-2 text-sm font-semibold ${resolution.decision === o.k ? 'border-[#163B66] bg-[#163B66] text-white' : 'border-gray-300 text-gray-700'}`}>
                      {o.l}
                    </button>
                  ))}
                </div>

                {resolution.decision === 'resolved' && (
                  <>
                    <Field label="Outcome">
                      <select value={resolution.outcome} onChange={(e) => setResolution((r) => ({ ...r, outcome: e.target.value }))} className={inputClass}>
                        {OUTCOMES.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Refund to customer (₹)" hint={`Up to ${money(dispute.refundable)} (paid minus earlier refunds).`}>
                      <input type="number" min="0" max={dispute.refundable} value={resolution.refundAmount} onChange={(e) => setResolution((r) => ({ ...r, refundAmount: e.target.value }))} className={inputClass} />
                    </Field>
                    {Number(resolution.refundAmount) > 0 && (
                      <Field label="Refund method">
                        <select value={resolution.refundMethod} onChange={(e) => setResolution((r) => ({ ...r, refundMethod: e.target.value }))} className={inputClass}>
                          <option value="wallet">Customer wallet (instant)</option>
                          <option value="original" disabled={!booking.razorpayPaymentId}>Original online payment{booking.razorpayPaymentId ? '' : ' (not paid online)'}</option>
                        </select>
                      </Field>
                    )}
                    {worker && (
                      <Field label="Penalty on professional (₹)" hint="Deducted from their earnings balance.">
                        <input type="number" min="0" value={resolution.workerPenalty} onChange={(e) => setResolution((r) => ({ ...r, workerPenalty: e.target.value }))} className={inputClass} />
                      </Field>
                    )}
                  </>
                )}

                <Field label="Note to both parties">
                  <textarea value={resolution.note} onChange={(e) => setResolution((r) => ({ ...r, note: e.target.value.slice(0, 1000) }))} rows={3} className={inputClass} />
                </Field>
                <Button className="w-full" variant={resolution.decision === 'rejected' ? 'danger' : 'primary'} onClick={resolve} disabled={resolving}>
                  {resolving ? <FiLoader className="animate-spin" /> : <FiCheckCircle />} {resolution.decision === 'rejected' ? 'Reject dispute' : 'Resolve dispute'}
                </Button>
              </div>
            </Card>
          ) : (
            <Card title="Resolution">
              <div className="space-y-1 text-sm text-gray-700">
                <p>Outcome: <b>{OUTCOMES.find((o) => o.key === res.outcome)?.label || res.outcome || '—'}</b></p>
                <p>Refund: <b>{money(res.refundAmount)}</b>{res.refundAmount > 0 ? ` via ${res.refundMethod}` : ''}</p>
                {res.refundReference && <p className="text-xs text-gray-500">Reference: {res.refundReference}</p>}
                <p>Penalty: <b>{money(res.workerPenalty)}</b></p>
                {res.note && <p className="text-gray-600">{res.note}</p>}
                <p className="text-xs text-gray-500">By {res.resolvedBy?.name || 'admin'} on {formatDateTime(res.resolvedAt)}</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default DisputeDetail;
