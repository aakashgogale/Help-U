import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiSend, FiCheckCircle, FiPaperclip } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import bookingFeaturesService from '../../services/bookingFeaturesService';
import useBookingConfig from '../../hooks/useBookingConfig';
import EvidencePicker from './EvidencePicker';
import IssueMediaGallery from '../booking/IssueMediaGallery';
import { disputeStatusMeta, formatDateTime, ACTIVE_DISPUTE_STATUSES, uploadedUrls, isUploading } from './disputeUi';

const NAVY = '#163B66';
const SENDER_LABEL = { user: 'Customer', worker: 'Professional', admin: 'Support team', system: 'Update' };

/**
 * One dispute: summary, resolution (when closed) and the message thread with
 * a reply box. Shared by the user and worker apps.
 */
const DisputeDetailPage = ({ role }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const config = useBookingConfig();
  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [showAttach, setShowAttach] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await bookingFeaturesService.getDispute(role, id);
      if (res.success) setDispute(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load dispute');
    } finally {
      setLoading(false);
    }
  }, [role, id]);

  useEffect(() => { load(); }, [load]);

  // Replies from support arrive as notifications; refresh when one is for this case.
  useEffect(() => {
    const refresh = () => load();
    window.addEventListener('userBookingsUpdated', refresh);
    window.addEventListener('workerNotificationsUpdated', refresh);
    return () => {
      window.removeEventListener('userBookingsUpdated', refresh);
      window.removeEventListener('workerNotificationsUpdated', refresh);
    };
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [dispute?.messages?.length]);

  const send = async (e) => {
    e.preventDefault();
    if (!reply.trim() && uploadedUrls(attachments).length === 0) return;
    if (isUploading(attachments)) return toast.error('Please wait for the photos to finish uploading');
    setSending(true);
    try {
      const res = await bookingFeaturesService.postDisputeMessage(role, id, {
        message: reply.trim(),
        attachments: uploadedUrls(attachments)
      });
      if (res.success) {
        setDispute(res.data);
        setReply('');
        setAttachments([]);
        setShowAttach(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <p className="text-gray-600">Dispute not found</p>
        <button type="button" onClick={() => navigate(-1)} className="text-sm font-bold text-sky-700">Go back</button>
      </div>
    );
  }

  const meta = disputeStatusMeta(dispute.status);
  const isActive = ACTIVE_DISPUTE_STATUSES.includes(dispute.status);
  const booking = dispute.bookingId || {};
  const resolution = dispute.resolution || {};
  const bookingBase = role === 'worker' ? '/worker/booking' : '/user/booking';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-gray-100" aria-label="Back">
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-gray-900">Dispute #{dispute.disputeNumber}</h1>
          <p className="text-xs text-gray-500 truncate">{dispute.reason}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${meta.className}`}>{meta.label}</span>
      </header>

      <main className="flex-1 px-4 py-4 space-y-4 pb-40">
        {/* Booking summary */}
        <button
          type="button"
          onClick={() => booking._id && navigate(`${bookingBase}/${booking._id}`)}
          className="w-full text-left bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
        >
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Booking</p>
          <p className="text-sm font-bold text-gray-900 mt-0.5">{booking.serviceName || 'Service'}</p>
          <p className="text-xs text-gray-500">#{booking.bookingNumber} · {formatDateTime(booking.scheduledDate)}</p>
          {dispute.amountPaid > 0 && (
            <p className="text-xs text-gray-500 mt-1">Paid ₹{Number(dispute.amountPaid).toLocaleString('en-IN')}</p>
          )}
        </button>

        {/* Original complaint */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Raised by {dispute.raisedBy === role ? 'you' : SENDER_LABEL[dispute.raisedBy]} · {formatDateTime(dispute.createdAt)}
          </p>
          <p className="text-sm text-gray-800 whitespace-pre-line break-words">{dispute.description}</p>
          {dispute.requestedRefund > 0 && (
            <p className="text-xs text-gray-500">Refund requested: ₹{Number(dispute.requestedRefund).toLocaleString('en-IN')}</p>
          )}
          {dispute.evidence?.length > 0 && (
            <IssueMediaGallery
              title="Evidence"
              photos={dispute.evidence.filter((e) => e.type !== 'video').map((e) => e.url)}
              videos={dispute.evidence.filter((e) => e.type === 'video').map((e) => e.url)}
            />
          )}
        </div>

        {/* Resolution */}
        {!isActive && resolution.resolvedAt && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-1">
            <div className="flex items-center gap-2">
              <FiCheckCircle className="w-4 h-4 text-emerald-600" />
              <p className="text-sm font-bold text-emerald-800">{dispute.status === 'resolved' ? 'Resolved' : 'Closed'}</p>
            </div>
            {resolution.refundAmount > 0 && role === 'user' && (
              <p className="text-sm text-emerald-800">
                Refund of ₹{Number(resolution.refundAmount).toLocaleString('en-IN')} {resolution.refundMethod === 'wallet' ? 'credited to your wallet' : 'sent to your original payment method'}.
              </p>
            )}
            {resolution.workerPenalty > 0 && role === 'worker' && (
              <p className="text-sm text-emerald-800">A penalty of ₹{Number(resolution.workerPenalty).toLocaleString('en-IN')} was applied to your earnings.</p>
            )}
            {resolution.note && <p className="text-sm text-emerald-700">{resolution.note}</p>}
            <p className="text-[11px] text-emerald-600">{formatDateTime(resolution.resolvedAt)}</p>
          </div>
        )}

        {/* Thread */}
        <div className="space-y-2">
          {(dispute.messages || []).map((m) => {
            if (m.senderType === 'system') {
              return (
                <div key={m._id} className="flex justify-center">
                  <p className="text-[11px] text-gray-500 bg-gray-200/70 rounded-full px-3 py-1 text-center max-w-[90%]">{m.message}</p>
                </div>
              );
            }
            const mine = m.senderType === role;
            return (
              <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[82%] rounded-2xl px-3 py-2 ${mine ? 'text-white rounded-br-md' : m.senderType === 'admin' ? 'bg-sky-50 border border-sky-100 text-gray-900 rounded-bl-md' : 'bg-white border border-gray-100 text-gray-900 rounded-bl-md'}`}
                  style={mine ? { backgroundColor: NAVY } : undefined}
                >
                  {!mine && (
                    <p className={`text-[10px] font-bold mb-0.5 ${m.senderType === 'admin' ? 'text-sky-700' : 'text-gray-500'}`}>
                      {SENDER_LABEL[m.senderType]}
                    </p>
                  )}
                  {m.message && <p className="text-sm whitespace-pre-line break-words">{m.message}</p>}
                  {m.attachments?.length > 0 && (
                    <div className="mt-1.5">
                      <IssueMediaGallery
                        title="Attachments"
                        size="sm"
                        photos={m.attachments.filter((a) => a.type !== 'video').map((a) => a.url)}
                        videos={m.attachments.filter((a) => a.type === 'video').map((a) => a.url)}
                      />
                    </div>
                  )}
                  <p className={`text-[10px] mt-0.5 text-right ${mine ? 'text-white/70' : 'text-gray-400'}`}>{formatDateTime(m.createdAt)}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </main>

      {isActive ? (
        <form onSubmit={send} className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 px-3 py-3 space-y-2" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          {showAttach && (
            <EvidencePicker role={role} items={attachments} setItems={setAttachments} max={config.maxDisputeEvidence || 5} />
          )}
          <div className="flex items-end gap-2">
            {(config.maxDisputeEvidence || 0) > 0 && (
              <button type="button" onClick={() => setShowAttach((v) => !v)} className="p-2.5 rounded-full text-gray-600 hover:bg-gray-100" aria-label="Attach photos">
                <FiPaperclip className="w-5 h-5" />
              </button>
            )}
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value.slice(0, 2000))}
              rows={1}
              placeholder="Write a reply"
              className="flex-1 resize-none max-h-28 bg-gray-100 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <button type="submit" disabled={sending} className="p-3 rounded-full text-white disabled:opacity-40" style={{ backgroundColor: NAVY }} aria-label="Send">
              <FiSend className="w-4 h-4" />
            </button>
          </div>
        </form>
      ) : (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 px-4 py-4 text-center text-sm text-gray-500">
          This dispute is closed. Contact support if you need more help.
        </div>
      )}
    </div>
  );
};

export default DisputeDetailPage;
