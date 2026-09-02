import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell } from 'react-icons/fi';
import { gsap } from 'gsap';
import { themeColors } from '../../../../theme';
import api from '../../../../services/api';

const NotificationBell = ({ notificationCount = 0 }) => {
  const navigate = useNavigate();
  const bellRef = useRef(null);
  const bellButtonRef = useRef(null);
  const [count, setCount] = useState(notificationCount);

  // Sync prop changes
  useEffect(() => {
    if (typeof notificationCount !== 'undefined') {
      setCount(notificationCount);
    }
  }, [notificationCount]);

  // Fetch unread count on mount
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
        if (!token) return; // Not logged in, count 0

        const res = await api.get('/notifications/user');
        if (res.data.success && typeof res.data.unreadCount === 'number') {
          setCount(res.data.unreadCount);
        }
      } catch (error) {
        // Silent fail (e.g. 401 not logged in)
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      ref={bellButtonRef}
      className="relative rounded-full cursor-pointer active:scale-95 transition-all duration-200 shrink-0"
      style={{
        width: '44px',
        height: '44px',
      }}
      onClick={(e) => {
        e.stopPropagation();
        navigate('/user/notifications');
      }}
      onMouseEnter={() => {
        if (bellRef.current) {
          gsap.to(bellRef.current, {
            rotation: 12,
            scale: 1.1,
            duration: 0.2,
            yoyo: true,
            repeat: 1,
            ease: 'power1.inOut'
          });
        }
      }}
      onMouseLeave={() => {
        if (bellRef.current) {
          gsap.to(bellRef.current, { rotation: 0, scale: 1, duration: 0.2 });
        }
      }}
    >
      <button
        type="button"
        aria-label="Notifications"
        className="w-full h-full rounded-full bg-white border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.06)] flex items-center justify-center transition-all duration-200 hover:border-gray-200 hover:shadow-[0_4px_14px_rgba(0,0,0,0.08)]"
      >
        <FiBell
          ref={bellRef}
          className="w-5 h-5 text-gray-700 transition-colors"
          strokeWidth={2}
        />
      </button>

      {/* Notification Count Badge */}
      {count > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white shadow-sm pointer-events-none"
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </div>
  );
};

export default NotificationBell;
