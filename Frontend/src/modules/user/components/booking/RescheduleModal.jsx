import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCalendar, FiClock, FiX, FiCheck, FiAlertCircle, FiChevronRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { themeColors } from '../../../../theme';
import useModalLock from '../../../../hooks/useModalLock';
import useBookingConfig from '../../../../hooks/useBookingConfig';
import { bookingService } from '../../../../services/bookingService';

const RescheduleModal = ({ isOpen, onClose, booking, onRescheduled }) => {
  useModalLock(isOpen);
  const bookingConfig = useBookingConfig();

  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Available dates based on admin config
  const availableDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    const daysAhead = Math.max(1, Number(bookingConfig.slotMaxDaysAhead) || 7);

    for (let i = 0; i < daysAhead; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      // Normalize to midnight local time
      d.setHours(0, 0, 0, 0);

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      let label = dayNames[d.getDay()];
      if (i === 0) label = 'Today';
      else if (i === 1) label = 'Tomorrow';

      dates.push({
        dateObj: d,
        dayLabel: label,
        weekday: dayNames[d.getDay()],
        dateNum: d.getDate(),
        month: monthNames[d.getMonth()]
      });
    }
    return dates;
  }, [bookingConfig.slotMaxDaysAhead]);

  const selectedDate = availableDates[selectedDateIndex]?.dateObj;

  // Available time slots for the selected date
  const availableSlots = useMemo(() => {
    if (!selectedDate) return [];

    const startHour = Math.max(0, Number(bookingConfig.slotStartHour) || 9);
    const endHour = Math.max(1, Number(bookingConfig.slotEndHour) || 20);
    const durationMin = Math.max(15, Number(bookingConfig.slotDurationMinutes) || 60);

    const startMin = startHour * 60;
    const endMin = endHour * 60;

    const fmtHHMM = (mins) => {
      const h = Math.floor(mins / 60) % 24;
      const m = mins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const fmtDisplay = (mins) => {
      const h = Math.floor(mins / 60) % 24;
      const m = mins % 60;
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      const ampm = h < 12 ? 'AM' : 'PM';
      return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
    };

    const slots = [];
    for (let m = startMin; m <= endMin; m += durationMin) {
      const nextM = m + durationMin;
      slots.push({
        value: fmtHHMM(m),
        end: fmtHHMM(nextM),
        startMin: m,
        display: `${fmtDisplay(m)} - ${fmtDisplay(nextM)}`,
        shortDisplay: fmtDisplay(m)
      });
    }

    // Filter out past slots if today is selected
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();

    if (isToday) {
      const leadMinutes = Number(bookingConfig.slotMinLeadMinutes) || 30;
      const earliestM = now.getHours() * 60 + now.getMinutes() + leadMinutes;
      return slots.filter((slot) => slot.startMin >= earliestM);
    }

    return slots;
  }, [selectedDate, bookingConfig]);

  // When modal opens or date changes, reset slot & error
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      // If current selected date has no slots (e.g. today late evening), move to tomorrow if available
      if (availableSlots.length === 0 && selectedDateIndex === 0 && availableDates.length > 1) {
        setSelectedDateIndex(1);
      } else {
        setSelectedSlot(null);
      }
    }
  }, [isOpen, selectedDateIndex, availableSlots.length, availableDates.length]);

  if (!isOpen || !booking) return null;

  // Format existing booking time for comparison
  const currentScheduledDateStr = booking.scheduledDate
    ? new Date(booking.scheduledDate).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      })
    : 'Not set';
  const currentScheduledTimeStr = booking.scheduledTime || booking.timeSlot?.start || 'N/A';

  const handleConfirmReschedule = async () => {
    if (!selectedDate || !selectedSlot) {
      setErrorMessage('Please select a date and an available time slot.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        scheduledDate: selectedDate.toISOString(),
        scheduledTime: selectedSlot.display,
        timeSlot: {
          start: selectedSlot.value,
          end: selectedSlot.end
        }
      };

      const bookingId = booking._id || booking.id;
      const res = await bookingService.reschedule(bookingId, payload);

      if (res && res.success) {
        toast.success(res.message || 'Booking rescheduled successfully!');
        if (onRescheduled) {
          onRescheduled(res.data || res.booking || { ...booking, ...payload });
        }
        onClose();
      } else {
        const msg = res?.message || 'Failed to reschedule booking.';
        setErrorMessage(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to reschedule. Please try another slot.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !submitting && onClose()}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Sheet / Modal */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className="relative w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col pb-[var(--safe-bottom)]"
        >
          {/* Mobile Drag Indicator */}
          <div className="flex justify-center py-2.5 sm:hidden shrink-0">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-teal-50 text-teal-700">
                  <FiCalendar className="w-4 h-4" />
                </span>
                <h2 className="text-xl font-bold text-gray-900">Reschedule Booking</h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Booking #{booking.bookingNumber || booking._id?.slice(-8)}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={submitting}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {/* Current Schedule Banner */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Current Appointment</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">
                  {currentScheduledDateStr}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <FiClock className="w-3.5 h-3.5 text-gray-400" />
                  {currentScheduledTimeStr}
                </p>
              </div>
              <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                Current
              </span>
            </div>

            {/* Step 1: Select Date */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">
                    1
                  </span>
                  Select New Date
                </label>
                {selectedDate && (
                  <span className="text-xs font-semibold text-teal-700">
                    {availableDates[selectedDateIndex]?.weekday}, {availableDates[selectedDateIndex]?.dateNum} {availableDates[selectedDateIndex]?.month}
                  </span>
                )}
              </div>

              {/* Horizontal Date Picker */}
              <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                {availableDates.map((d, idx) => {
                  const isSelected = selectedDateIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedDateIndex(idx);
                        setSelectedSlot(null);
                        setErrorMessage('');
                      }}
                      className={`shrink-0 min-w-[70px] py-3 px-3 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50/70 text-teal-800 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <span className={`text-[11px] font-bold tracking-tight ${isSelected ? 'text-teal-700' : 'text-gray-500'}`}>
                        {d.dayLabel}
                      </span>
                      <span className="text-lg font-extrabold mt-0.5 leading-tight">{d.dateNum}</span>
                      <span className="text-[10px] font-medium text-gray-400">{d.month}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Select Time Slot */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">
                    2
                  </span>
                  Select Time Slot
                </label>
                {selectedSlot && (
                  <span className="text-xs font-semibold text-teal-700">
                    {selectedSlot.display}
                  </span>
                )}
              </div>

              {availableSlots.length === 0 ? (
                <div className="p-6 bg-amber-50/60 rounded-2xl border border-amber-200/70 text-center">
                  <FiAlertCircle className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-amber-900">No time slots available for this day</p>
                  <p className="text-xs text-amber-700 mt-1">
                    All service slots for today have either passed or require advance booking. Please choose a future date above.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {availableSlots.map((slot) => {
                    const isSelected = selectedSlot?.value === slot.value;
                    return (
                      <button
                        key={slot.value}
                        type="button"
                        onClick={() => {
                          setSelectedSlot(slot);
                          setErrorMessage('');
                        }}
                        className={`p-3 rounded-2xl border-2 text-left transition-all relative ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50 text-teal-900 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold leading-tight">{slot.shortDisplay}</span>
                          {isSelected && <FiCheck className="w-4 h-4 text-teal-600 shrink-0" />}
                        </div>
                        <span className="text-[11px] text-gray-500 block mt-0.5 truncate">{slot.display}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-red-700 text-xs">
                <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <p className="font-medium leading-relaxed">{errorMessage}</p>
              </div>
            )}

            {/* Policy Note */}
            <div className="bg-sky-50/80 rounded-2xl p-3.5 border border-sky-100/80 text-[12px] text-sky-800 leading-relaxed">
              💡 <strong>Free Rescheduling:</strong> Rescheduling is free of charge before the service professional departs. If a professional was already assigned, they will be notified automatically.
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50/50 flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-3.5 rounded-2xl border border-gray-300 font-bold text-sm text-gray-700 bg-white hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Keep Current
            </button>
            <button
              type="button"
              onClick={handleConfirmReschedule}
              disabled={submitting || !selectedSlot}
              className="flex-[2] py-3.5 rounded-2xl font-bold text-sm text-white transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                backgroundColor: selectedSlot ? (themeColors.button || '#00A6A6') : '#94a3b8'
              }}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Rescheduling...</span>
                </>
              ) : (
                <>
                  <span>Confirm Reschedule</span>
                  <FiChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default RescheduleModal;
