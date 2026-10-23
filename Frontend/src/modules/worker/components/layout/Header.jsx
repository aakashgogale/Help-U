import React, { memo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiBell, FiSearch } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { workerTheme as themeColors } from '../../../../theme';
import Logo from '../../../../components/common/Logo';
import api from '../../../../services/api';

const Header = memo(({
  title,
  onBack,
  showBack = true,
  showSearch = false,
  showNotifications = true,
  notificationCount = 0
}) => {
  const navigate = useNavigate();
  const [count, setCount] = useState(notificationCount);

  // Sync prop changes
  useEffect(() => {
    if (typeof notificationCount !== 'undefined') {
      setCount(notificationCount);
    }
  }, [notificationCount]);

  // Fetch unread count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await api.get('/notifications/worker');
        if (res.data.success && typeof res.data.unreadCount === 'number') {
          setCount(res.data.unreadCount);
        }
      } catch (error) {
        // Silent fail
      }
    };

    if (showNotifications) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 60000); // Poll every minute
      return () => clearInterval(interval);
    }
  }, [showNotifications]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleNotifications = () => {
    navigate('/worker/notifications');
  };

  const handleLogoClick = () => {
    navigate('/worker/dashboard');
  };

  return (
    <header
      className="sticky top-0 z-40 w-full bg-white border-b border-slate-200/80 shadow-xs"
    >
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Left: Back button or Logo */}
        <div className="flex items-center gap-3">
          {showBack ? (
            <motion.button
              onClick={handleBack}
              className="p-2 rounded-full hover:bg-slate-100 transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              <FiArrowLeft className="w-5 h-5 text-slate-700" />
            </motion.button>
          ) : (
            <motion.div
              className="cursor-pointer"
              onClick={handleLogoClick}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Logo className="h-12 w-auto" />
            </motion.div>
          )}
          {showBack && <h1 className="text-base font-bold text-slate-800">{title || 'Service Partner'}</h1>}
        </div>

        {/* Right: Search and Notifications */}
        <div className="flex items-center gap-2">
          {showSearch && (
            <button
              className="p-2 rounded-full hover:bg-slate-100 transition-colors active:scale-95 text-slate-700"
              onClick={() => navigate('/worker/jobs')}
            >
              <FiSearch className="w-5 h-5" />
            </button>
          )}
          {showNotifications && (
            <motion.button
              onClick={handleNotifications}
              className="relative p-2.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              <FiBell className="w-5 h-5 text-slate-700" />
              {count > 0 && (
                <span
                  className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border-2 border-white shadow-xs"
                >
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </motion.button>
          )}
        </div>
      </div>
    </header>
  );
});

Header.displayName = 'WorkerHeader';
export default Header;
