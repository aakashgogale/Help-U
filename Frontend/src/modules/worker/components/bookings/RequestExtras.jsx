import React from 'react';
import { FiFileText, FiPlusCircle } from 'react-icons/fi';
import IssueMediaGallery from '../../../../components/booking/IssueMediaGallery';
import DetailChips from '../../../../components/common/DetailChips';
import { bookedDetailsOf } from '../../../../utils/bookedDetails';

/**
 * Compact summary of what the customer added to a job request — instructions,
 * add-ons and problem photos/videos — for alert modals and job cards.
 * Renders nothing when there is none.
 */
const RequestExtras = ({ booking, className = '' }) => {
  if (!booking) return null;
  const addOns = booking.addOns || [];
  const hasMedia = (booking.issuePhotos?.length || 0) + (booking.issueVideos?.length || 0) > 0;
  const answered = bookedDetailsOf(booking);
  if (!booking.customerNotes && addOns.length === 0 && !hasMedia && answered.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`} onClick={(e) => e.stopPropagation()}>
      {/* What to bring: the answers the customer gave (brand, type...) */}
      {answered.map((item, i) => (
        <div key={`${item.title}-${i}`}>
          {answered.length > 1 && <p className="text-[10px] font-bold text-gray-500 mb-1">{item.title}</p>}
          <DetailChips details={item.details} />
        </div>
      ))}
      {booking.customerNotes && (
        <div className="flex items-start gap-1.5 bg-amber-50/70 border border-amber-100 rounded-lg px-2 py-1.5">
          <FiFileText className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[11px] text-gray-800 line-clamp-2 break-words">{booking.customerNotes}</p>
        </div>
      )}
      {addOns.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <FiPlusCircle className="w-3.5 h-3.5 text-gray-400" />
          {addOns.map((a, i) => (
            <span key={`${a.title}-${i}`} className="text-[10px] font-bold text-slate-700 bg-slate-100 rounded-full px-2 py-0.5">
              {a.title}{a.quantity > 1 ? ` ×${a.quantity}` : ''}
            </span>
          ))}
        </div>
      )}
      {hasMedia && <IssueMediaGallery photos={booking.issuePhotos} videos={booking.issueVideos} size="sm" title="Problem media" />}
    </div>
  );
};

export default RequestExtras;
