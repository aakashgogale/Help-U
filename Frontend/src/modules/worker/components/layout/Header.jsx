import React, { memo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiBell, FiSearch, FiMapPin, FiChevronDown } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { workerTheme as themeColors } from '../../../../theme';
import Logo from '../../../../components/common/Logo';
import api from '../../../../services/api';
import workerService from '../../../../services/workerService';

const LOCATION_CACHE_KEY = 'workerLocationLabel';

// Short label for the pill: the worker's saved address, trimmed to something that fits
const toLocationLabel = (addr) => {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  const text = addr.fullAddress || addr.address || [addr.addressLine1, addr.city].filter(Boolean).join(', ') || [addr.city, addr.state].filter(Boolean).join(', ');
  return text || '';
};

const Header = memo(({
  title,
  onBack,
  showBack = true,
  showSearch = false,
  showNotifications = true,
  showLocation = false,
  notificationCount = 0
}) => {
  const navigate = useNavigate();
  const [count, setCount] = useState(notificationCount);
  const [locationLabel, setLocationLabel] = useState(() => {
    try { return localStorage.getItem(LOCATION_CACHE_KEY) || ''; } catch { return ''; }
  });

  // Worker's saved service address (cached so the pill is there instantly on the next visit)
  useEffect(() => {
    if (!showLocation) return undefined;
    let active = true;
    workerService.getProfile()
      .then((res) => {
        const label = toLocationLabel(res?.worker?.address);
        if (!active) return;
        setLocationLabel(label);
        try { label ? localStorage.setItem(LOCATION_CACHE_KEY, label) : localStorage.removeItem(LOCATION_CACHE_KEY); } catch { /* ignore */ }
      })
      .catch(() => { /* keep cached label */ });
    return () => { active = false; };
  }, [showLocation]);

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

        {/* Centre: location */}
        {showLocation && (
          <button
            type="button"
            onClick={() => navigate('/worker/address-management')}
            className="flex-1 min-w-0 mx-3 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 active:scale-[0.97] transition-all"
          >
            <FiMapPin className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="text-[12.5px] font-bold text-slate-800 truncate">
              {locationLabel || 'Set your location'}
            </span>
            <FiChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-500" />
          </button>
        )}

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
