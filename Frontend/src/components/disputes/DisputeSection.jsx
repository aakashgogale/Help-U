import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertOctagon, FiChevronRight } from 'react-icons/fi';
import bookingFeaturesService from '../../services/bookingFeaturesService';
import useBookingConfig from '../../hooks/useBookingConfig';
import RaiseDisputeModal from './RaiseDisputeModal';
import { disputeStatusMeta } from './disputeUi';

/**
 * "Report a problem" card on a booking page. Shows the booking's dispute if
 * there is one, otherwise a button to raise one while the booking is eligible.
 * Renders nothing when disputes are disabled or there is nothing to show.
 */
const DisputeSection = ({ role, booking, className = '' }) => {
  const config = useBookingConfig();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const bookingId = booking?._id || booking?.id;
  const status = booking?.status;

  const load = useCallback(() => {
    if (!bookingId || !config.isDisputeEnabled) return;
    bookingFeaturesService.getBookingDisputeInfo(role, bookingId)
      .then((res) => { if (res.success) setInfo(res.data); })
      .catch(() => {});
  }, [bookingId, role, config.isDisputeEnabled]);

  // Reload when the booking moves on (e.g. becomes completed).
  useEffect(() => { load(); }, [load, status]);

  if (!config.isDisputeEnabled || !info) return null;

  const base = role === 'worker' ? '/worker' : '/user';
  const dispute = info.dispute;

  if (dispute) {
    const meta = disputeStatusMeta(dispute.status);
    return (
      <button
        type="button"
        onClick={() => navigate(`${base}/disputes/${dispute._id}`)}
        className={`w-full text-left bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-4 flex items-center gap-3 ${className}`}
      >
        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
          <FiAlertOctagon className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">Dispute #{dispute.disputeNumber}</p>
          <p className="text-xs text-gray-500 truncate">{dispute.reason}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${meta.className}`}>{meta.label}</span>
        <FiChevronRight className="w-4 h-4 text-gray-400" />
      </button>
    );
  }

  if (!info.eligibility?.eligible) return null;

  return (
    <>
      <div className={`bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-4 flex items-center gap-3 ${className}`}>
        <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
          <FiAlertOctagon className="w-5 h-5 text-rose-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">Something wrong with this booking?</p>
          <p className="text-xs text-gray-500">
            {info.eligibility.deadline
              ? `You can report it until ${new Date(info.eligibility.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.`
              : 'Tell us and our team will help.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 shrink-0"
        >
          Report
        </button>
      </div>
      <RaiseDisputeModal
        role={role}
        bookingId={bookingId}
        info={info}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onRaised={(d) => {
          load();
          if (d?._id) navigate(`${base}/disputes/${d._id}`);
        }}
      />
    </>
  );
};

export default DisputeSection;
