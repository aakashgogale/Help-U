import React from 'react';
import { FiAlertTriangle, FiFileText, FiPlusCircle, FiRepeat } from 'react-icons/fi';
import IssueMediaGallery from './IssueMediaGallery';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/**
 * What the customer added at checkout beyond the service itself: emergency
 * request, instructions, add-ons and problem photos/videos. Shared by the
 * user app, worker app and admin panel. Renders nothing when there is none.
 *
 * showPrices: show add-on and surcharge amounts (customer and admin views).
 */
const BookingExtrasCard = ({ booking, showPrices = true, title = 'Booking Details', className = '' }) => {
  if (!booking) return null;

  const addOns = booking.addOns || [];
  const hasMedia = (booking.issuePhotos?.length || 0) + (booking.issueVideos?.length || 0) > 0;
  const hasAnything = booking.isEmergency || booking.customerNotes || addOns.length > 0 || hasMedia || booking.recurringBookingId;
  if (!hasAnything) return null;

  return (
    <section className={`bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50">
        <h3 className="font-bold text-gray-900">{title}</h3>
      </div>

      <div className="p-5 space-y-4">
        {booking.isEmergency && (
          <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-2xl p-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500 flex items-center justify-center shrink-0">
              <FiAlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-rose-700">Emergency booking</p>
              <p className="text-xs text-rose-600">Priority dispatch to the nearest available professional.</p>
            </div>
            {showPrices && booking.emergencyCharge > 0 && (
              <span className="text-sm font-bold text-rose-700 shrink-0">{money(booking.emergencyCharge)}</span>
            )}
          </div>
        )}

        {booking.recurringBookingId && (
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
            <FiRepeat className="w-4 h-4" /> Part of a recurring booking plan
          </div>
        )}

        {booking.customerNotes && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <FiFileText className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Customer instructions</span>
            </div>
            <p className="text-sm text-gray-800 bg-amber-50/60 border border-amber-100 rounded-xl p-3 whitespace-pre-line break-words">
              {booking.customerNotes}
            </p>
          </div>
        )}

        {addOns.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <FiPlusCircle className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Add-ons</span>
            </div>
            <div className="space-y-1.5">
              {addOns.map((a, i) => (
                <div key={a._id || i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                  <span className="text-sm font-medium text-gray-800">
                    {a.title}
                    {a.quantity > 1 && <span className="text-xs text-gray-500"> × {a.quantity}</span>}
                  </span>
                  {showPrices && a.total != null && (
                    <span className="text-sm font-bold text-gray-900">{money(a.total)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {hasMedia && (
          <IssueMediaGallery photos={booking.issuePhotos} videos={booking.issueVideos} />
        )}
      </div>
    </section>
  );
};

export default BookingExtrasCard;
