import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiArrowLeft, FiSend, FiImage, FiLock, FiCheck } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import bookingFeaturesService from '../../services/bookingFeaturesService';
import { compressImage, fileToBase64 } from '../../utils/imageCompression';

const NAVY = '#163B66';

const timeOf = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
const dayOf = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Full-screen chat between the customer and the professional on a booking.
 * role: 'user' | 'worker' — whose side of the conversation this screen is.
 *
 * New messages and read receipts arrive through SocketContext as
 * 'bookingChatMessage' / 'bookingChatRead' window events.
 */
const BookingChat = ({ role, bookingId, isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [chat, setChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [viewImage, setViewImage] = useState(null);
  const listRef = useRef(null);
  const fileRef = useRef(null);
  const stickToBottom = useRef(true);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await bookingFeaturesService.getChat(role, bookingId);
      if (res.success) {
        setMessages(res.data.messages || []);
        setHasMore(!!res.data.hasMore);
        setChat(res.data.chat);
        stickToBottom.current = true;
        scrollToBottom();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load chat');
    } finally {
      setLoading(false);
    }
  }, [role, bookingId]);

  const loadOlder = async () => {
    if (!messages.length) return;
    try {
      const el = listRef.current;
      const prevHeight = el?.scrollHeight || 0;
      const res = await bookingFeaturesService.getChat(role, bookingId, { before: messages[0]._id, markRead: 'false' });
      if (res.success) {
        setMessages((prev) => [...(res.data.messages || []), ...prev]);
        setHasMore(!!res.data.hasMore);
        requestAnimationFrame(() => {
          if (el) el.scrollTop = el.scrollHeight - prevHeight;
        });
      }
    } catch {
      toast.error('Failed to load older messages');
    }
  };

  // Open/close: load and register as the active chat so its notifications
  // are not toasted while it is on screen.
  useEffect(() => {
    if (!isOpen || !bookingId) return undefined;
    window.__activeChatBookingId = String(bookingId);
    load();
    return () => {
      if (window.__activeChatBookingId === String(bookingId)) window.__activeChatBookingId = null;
    };
  }, [isOpen, bookingId, load]);

  // Live updates.
  useEffect(() => {
    if (!isOpen) return undefined;

    const onMessage = (e) => {
      const { bookingId: id, message } = e.detail || {};
      if (String(id) !== String(bookingId) || !message) return;
      setMessages((prev) => (prev.some((m) => m._id === message._id) ? prev : [...prev, message]));
      if (message.senderType !== role) {
        bookingFeaturesService.markChatRead(role, bookingId).catch(() => {});
      }
      if (stickToBottom.current) scrollToBottom();
    };
    const onRead = (e) => {
      const { bookingId: id, readBy, readAt } = e.detail || {};
      if (String(id) !== String(bookingId) || readBy === role) return;
      setMessages((prev) => prev.map((m) => (m.senderType === role && !m.readAt ? { ...m, readAt } : m)));
    };

    window.addEventListener('bookingChatMessage', onMessage);
    window.addEventListener('bookingChatRead', onRead);
    return () => {
      window.removeEventListener('bookingChatMessage', onMessage);
      window.removeEventListener('bookingChatRead', onRead);
    };
  }, [isOpen, bookingId, role]);

  const send = async ({ message, image }) => {
    if (sending) return;
    setSending(true);
    try {
      const res = await bookingFeaturesService.sendChatMessage(role, bookingId, { message, image });
      if (res.success && res.data) {
        setMessages((prev) => (prev.some((m) => m._id === res.data._id) ? prev : [...prev, res.data]));
        stickToBottom.current = true;
        scrollToBottom();
        return true;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Message not sent');
      if (error.response?.data?.code === 'CHAT_CLOSED') load();
    } finally {
      setSending(false);
    }
    return false;
  };

  const handleSendText = async (e) => {
    e?.preventDefault();
    const message = text.trim();
    if (!message) return;
    const ok = await send({ message });
    if (ok) setText('');
  };

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const compressed = await compressImage(file, { maxWidth: 1280, maxHeight: 1280, quality: 0.8, mimeType: 'image/jpeg' });
      const dataUrl = await fileToBase64(compressed);
      await send({ image: dataUrl, message: text.trim() || undefined });
      setText('');
    } catch {
      toast.error('Could not send the photo');
    }
  };

  if (!isOpen) return null;

  const canSend = chat?.canSend;
  let lastDay = null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-50 flex flex-col" role="dialog" aria-modal="true" aria-label="Chat">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-3 py-3 flex items-center gap-3 shadow-sm">
        <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100" aria-label="Close chat">
          <FiArrowLeft className="w-5 h-5 text-gray-800" />
        </button>
        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
          {chat?.counterpart?.photo ? (
            <img src={chat.counterpart.photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="font-bold text-slate-500">{(chat?.counterpart?.name || '?').charAt(0)}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-gray-900 truncate">{chat?.counterpart?.name || 'Chat'}</p>
          <p className="text-xs text-gray-500 truncate">
            {chat?.serviceName}{chat?.bookingNumber ? ` · #${chat.bookingNumber}` : ''}
          </p>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-2"
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center">
                <button type="button" onClick={loadOlder} className="text-xs font-semibold text-sky-700 bg-white border border-gray-200 rounded-full px-3 py-1">
                  Load earlier messages
                </button>
              </div>
            )}

            {messages.length === 0 && (
              <div className="text-center text-sm text-gray-500 py-10 px-6">
                {role === 'user'
                  ? 'Send a message to your professional about the job, directions or timing.'
                  : 'Send a message to the customer about the job, directions or timing.'}
              </div>
            )}

            {messages.map((m) => {
              const mine = m.senderType === role;
              const day = dayOf(m.createdAt);
              const showDay = day !== lastDay;
              lastDay = day;
              return (
                <React.Fragment key={m._id}>
                  {showDay && (
                    <div className="flex justify-center py-1">
                      <span className="text-[10px] font-semibold text-gray-500 bg-gray-200/70 rounded-full px-2.5 py-0.5">{day}</span>
                    </div>
                  )}
                  <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[78%] rounded-2xl px-3 py-2 shadow-sm ${mine ? 'text-white rounded-br-md' : 'bg-white text-gray-900 rounded-bl-md border border-gray-100'}`}
                      style={mine ? { backgroundColor: NAVY } : undefined}
                    >
                      {m.attachments?.map((a) => (
                        <button key={a.url} type="button" onClick={() => setViewImage(a.url)} className="block mb-1">
                          <img src={a.url} alt="Shared" className="rounded-xl max-h-60 object-cover" loading="lazy" />
                        </button>
                      ))}
                      {m.message && <p className="text-sm whitespace-pre-line break-words">{m.message}</p>}
                      <p className={`text-[10px] mt-0.5 flex items-center gap-1 justify-end ${mine ? 'text-white/70' : 'text-gray-400'}`}>
                        {timeOf(m.createdAt)}
                        {mine && (
                          <span className="flex" aria-label={m.readAt ? 'Read' : 'Sent'}>
                            <FiCheck className="w-3 h-3" />
                            {m.readAt && <FiCheck className="w-3 h-3 -ml-1.5" />}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </>
        )}
      </div>

      {/* Composer */}
      {chat && !canSend ? (
        <div className="bg-white border-t border-gray-100 px-4 py-4 flex items-center gap-2 text-sm text-gray-500">
          <FiLock className="w-4 h-4 shrink-0" /> {chat.reason}
        </div>
      ) : (
        <form onSubmit={handleSendText} className="bg-white border-t border-gray-100 px-3 py-3 flex items-end gap-2" style={{ paddingBottom: 'max(12px, var(--safe-bottom))' }}>
          {chat?.imageEnabled && (
            <>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={sending}
                className="p-2.5 rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                aria-label="Send photo"
              >
                <FiImage className="w-5 h-5" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
            </>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 1000))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); }
            }}
            rows={1}
            placeholder="Type a message"
            className="flex-1 resize-none max-h-28 bg-gray-100 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="p-3 rounded-full text-white disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: NAVY }}
            aria-label="Send"
          >
            <FiSend className="w-4 h-4" />
          </button>
        </form>
      )}

      {viewImage && (
        <div className="fixed inset-0 z-[10001] bg-black/95 flex items-center justify-center" onClick={() => setViewImage(null)}>
          <img src={viewImage} alt="Shared" className="max-w-[92vw] max-h-[85vh] object-contain rounded-lg" />
        </div>
      )}
    </div>,
    document.body
  );
};

export default BookingChat;
