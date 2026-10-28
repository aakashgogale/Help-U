import React, { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiCheckCircle, 
  FiXCircle, 
  FiClock, 
  FiCalendar, 
  FiUser, 
  FiMapPin, 
  FiChevronRight, 
  FiChevronLeft,
  FiArrowRight,
  FiPhone,
  FiCheck,
  FiAlertCircle
} from 'react-icons/fi';
import { FaWallet } from 'react-icons/fa';

const TodayOverview = memo(({ 
  stats = {}, 
  pendingBookings = [], 
  onAcceptBooking, 
  onRejectBooking, 
  onOpenBookingAlert 
}) => {
  const navigate = useNavigate();
  const [selectedPendingIndex, setSelectedPendingIndex] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  const todayEarnings = stats.todayEarnings || 0;
  const todayAccepted = stats.todayAccepted ?? 0;
  const todayRejected = stats.todayRejected ?? 0;
  const todayPending = stats.todayPending ?? pendingBookings.length;

  const currentPendingJob = pendingBookings[selectedPendingIndex] || pendingBookings[0] || null;

  const handleConfirmSchedule = async (e, booking) => {
    e.stopPropagation();
    if (!booking) return;
    const bId = booking.id || booking._id;
    setActionLoading(true);
    try {
      if (onAcceptBooking) {
        await onAcceptBooking(bId);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineSchedule = async (e, booking) => {
    e.stopPropagation();
    if (!booking) return;
    const bId = booking.id || booking._id;
    setActionLoading(true);
    try {
      if (onRejectBooking) {
        await onRejectBooking(bId);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const formattedToday = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });

  return (
    <div className="space-y-3.5">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-800">Today's Overview</h2>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full uppercase tracking-wider">
            {formattedToday}
          </span>
        </div>
        <span className="text-xs text-slate-400 font-medium">Daily activity</span>
      </div>

      {/* 1. Today's Earnings Box */}
      <div
        onClick={() => navigate('/worker/wallet')}
        className="rounded-2xl p-4 text-white cursor-pointer active:scale-98 transition-all relative overflow-hidden flex items-center justify-between shadow-xs hover:shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #163B66 0%, #1E4C82 100%)',
          boxShadow: '0 4px 16px rgba(22, 59, 102, 0.12)'
        }}
      >
        <div className="flex items-center gap-3.5 z-10">
          <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center justify-center text-emerald-400 text-xl">
            <FaWallet />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
              Today's Earnings
            </span>
            <div className="text-2xl font-black text-white tracking-tight mt-1">
              ₹{Number(todayEarnings).toLocaleString()}
            </div>
            <p className="text-[11px] text-blue-100/80 font-medium">
              Daily revenue earned
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-100 bg-white/10 hover:bg-white/15 border border-white/15 px-3 py-1.5 rounded-xl transition-colors z-10">
          <span>Wallet</span>
          <FiChevronRight className="w-4 h-4" />
        </div>
      </div>

      {/* 2. Today's Jobs Status Boxes (Accepted, Rejected, Pending) */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Accepted Box */}
        <div
          onClick={() => navigate('/worker/jobs')}
          className="bg-white rounded-xl p-3 border border-slate-200/80 cursor-pointer active:scale-95 transition-all shadow-xs hover:shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
              Accepted
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FiCheckCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-slate-900 tracking-tight">
              {todayAccepted}
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Jobs accepted</p>
          </div>
        </div>

        {/* Rejected Box */}
        <div
          className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
              Rejected
            </span>
            <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <FiXCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-slate-900 tracking-tight">
              {todayRejected}
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Jobs declined</p>
          </div>
        </div>

        {/* Pending Box */}
        <div
          onClick={() => {
            if (pendingBookings.length > 0 && onOpenBookingAlert) {
              onOpenBookingAlert(pendingBookings[0]);
            } else {
              navigate('/worker/booking-alerts');
            }
          }}
          className={`bg-white rounded-xl p-3 border cursor-pointer active:scale-95 transition-all shadow-xs hover:shadow-sm flex flex-col justify-between ${
            todayPending > 0 ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">
              Pending
            </span>
            <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <FiClock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-amber-900 tracking-tight">
              {todayPending}
            </div>
            <p className="text-[10px] text-amber-700/80 font-medium">Needs action</p>
          </div>
        </div>
      </div>

      {/* 3. Pending Schedules by Customer Confirmation Details Box */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#163B66] flex items-center justify-center">
              <FiCalendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800">Customer Schedule Confirmation</h3>
              <p className="text-[10px] text-slate-400">Review & confirm customer requested slot</p>
            </div>
          </div>

          {pendingBookings.length > 1 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <button
                disabled={selectedPendingIndex === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPendingIndex(prev => Math.max(0, prev - 1));
                }}
                className="w-6 h-6 rounded-md border border-slate-200 flex items-center justify-center disabled:opacity-30 active:scale-90"
              >
                <FiChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-bold text-slate-600">
                {selectedPendingIndex + 1}/{pendingBookings.length}
              </span>
              <button
                disabled={selectedPendingIndex >= pendingBookings.length - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPendingIndex(prev => Math.min(pendingBookings.length - 1, prev + 1));
                }}
                className="w-6 h-6 rounded-md border border-slate-200 flex items-center justify-center disabled:opacity-30 active:scale-90"
              >
                <FiChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {currentPendingJob ? (
          <div className="space-y-3">
            {/* Booking & Customer details */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                      Slot Confirmation
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 truncate">
                      {currentPendingJob.serviceCategory || 'Service'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 truncate">
                    {currentPendingJob.serviceName || 'Service Request'}
                  </h4>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-emerald-600">
                    ₹{currentPendingJob.price || currentPendingJob.vendorEarnings || 0}
                  </div>
                  <span className="text-[10px] text-slate-400">Partner Earning</span>
                </div>
              </div>

              {/* Customer info & Address */}
              <div className="mt-2.5 pt-2 border-t border-slate-200/60 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                  <FiUser className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{currentPendingJob.customerName || 'Customer'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <FiMapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate text-[11px]">
                    {currentPendingJob.location?.address || currentPendingJob.address?.addressLine1 || 'Customer Address'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                  <FiClock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-700">
                    Customer Slot: {currentPendingJob.timeSlot?.date || (currentPendingJob.scheduledDate ? new Date(currentPendingJob.scheduledDate).toLocaleDateString() : 'Today')} 
                    {currentPendingJob.timeSlot?.time ? ` • ${currentPendingJob.timeSlot?.time}` : (currentPendingJob.scheduledTime ? ` • ${currentPendingJob.scheduledTime}` : '')}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons for Schedule Confirmation */}
            <div className="flex items-center gap-2">
              <button
                disabled={actionLoading}
                onClick={(e) => handleConfirmSchedule(e, currentPendingJob)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <FiCheck className="w-4 h-4" />
                <span>{actionLoading ? 'Confirming...' : 'Confirm Schedule'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenBookingAlert) {
                    onOpenBookingAlert(currentPendingJob);
                  }
                }}
                className="px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 active:scale-98 text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-1"
              >
                <span>Details</span>
                <FiArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                disabled={actionLoading}
                onClick={(e) => handleDeclineSchedule(e, currentPendingJob)}
                className="px-3 py-2.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/50 active:scale-98 text-xs font-bold text-rose-600 transition-all"
                title="Decline"
              >
                Decline
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50/80 rounded-xl p-4 text-center border border-dashed border-slate-200">
            <FiCheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-1.5" />
            <p className="text-xs font-bold text-slate-700">All Customer Schedules Confirmed</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              No pending booking requests awaiting customer slot confirmation right now.
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

TodayOverview.displayName = 'WorkerTodayOverview';

export default TodayOverview;