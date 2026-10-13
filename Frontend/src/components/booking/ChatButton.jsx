import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiMessageCircle } from 'react-icons/fi';
import BookingChat from './BookingChat';
import bookingFeaturesService from '../../services/bookingFeaturesService';
import useBookingConfig from '../../hooks/useBookingConfig';

/**
 * "Chat with professional / customer" button with an unread badge.
 * Opens automatically when the page URL has ?chat=1 (links from chat
 * notifications). Hidden when chat is disabled or no worker is assigned yet.
 */
const ChatButton = ({ role, booking, className = '', label }) => {
  const config = useBookingConfig();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const bookingId = booking?._id || booking?.id;
  const hasWorker = !!(booking?.vendorId?._id || booking?.vendorId);
  const visible = config.isChatEnabled && bookingId && hasWorker;

  const refreshUnread = useCallback(() => {
    if (!visible) return;
    bookingFeaturesService.getChatUnread(role, bookingId)
      .then((res) => setUnread(res.unread || 0))
      .catch(() => {});
  }, [visible, role, bookingId]);

  useEffect(() => { refreshUnread(); }, [refreshUnread]);

  // Count messages that arrive while the chat is closed.
  useEffect(() => {
    if (!visible) return undefined;
    const onMessage = (e) => {
      const { bookingId: id, message } = e.detail || {};
      const chatOpen = String(window.__activeChatBookingId) === String(bookingId);
      if (String(id) === String(bookingId) && message?.senderType !== role && !chatOpen) {
        setUnread((n) => n + 1);
      }
    };
    window.addEventListener('bookingChatMessage', onMessage);
    return () => window.removeEventListener('bookingChatMessage', onMessage);
  }, [visible, bookingId, role]);

  if (!visible) return null;

  // Links from chat notifications carry ?chat=1 to open the chat directly.
  const openedFromLink = new URLSearchParams(location.search).get('chat') === '1';
  const isOpen = open || openedFromLink;

  const close = () => {
    setOpen(false);
    setUnread(0);
    if (openedFromLink) navigate(location.pathname, { replace: true });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setUnread(0); }}
        className={`relative flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-bold text-sm bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 active:scale-[0.98] transition-all ${className}`}
      >
        <FiMessageCircle className="w-5 h-5" />
        {label || (role === 'user' ? 'Chat with professional' : 'Chat with customer')}
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <BookingChat role={role} bookingId={bookingId} isOpen={isOpen} onClose={close} />
    </>
  );
};

export default ChatButton;
