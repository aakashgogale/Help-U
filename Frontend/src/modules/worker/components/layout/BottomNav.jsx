import React, { useState, useEffect, useLayoutEffect, useRef, memo, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiBriefcase, FiUser } from 'react-icons/fi';
import { HiHome, HiBriefcase, HiUser } from 'react-icons/hi';
import { IoWalletOutline, IoWallet } from 'react-icons/io5';
import { workerTheme as themeColors } from '../../../../theme';

const BottomNav = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingJobsCount, setPendingJobsCount] = useState(0);
  const navRef = useRef(null);

  // Load pending jobs count from localStorage
  useEffect(() => {
    const updatePendingCount = () => {
      try {
        // Count active jobs (PENDING only) to show new requests
        const acceptedBookings = JSON.parse(localStorage.getItem('workerAcceptedBookings') || '[]');
        const activeJobs = acceptedBookings.filter(job => job.status === 'PENDING');
        setPendingJobsCount(activeJobs.length);
      } catch (error) {
        console.error('Error reading pending jobs:', error);
      }
    };

    updatePendingCount();
    window.addEventListener('storage', updatePendingCount);
    window.addEventListener('workerJobsUpdated', updatePendingCount);

    return () => {
      window.removeEventListener('storage', updatePendingCount);
      window.removeEventListener('workerJobsUpdated', updatePendingCount);
    };
  }, []);

  // Use useMemo to update navItems when pendingJobsCount changes
  const navItems = useMemo(() => {
    // Count jobs that require attention (Pending, Accepted, In Progress)
    const badgeCount = pendingJobsCount;

    return [
      { path: '/worker/dashboard', icon: FiHome, activeIcon: HiHome, label: 'Home' },
      { path: '/worker/jobs', icon: FiBriefcase, activeIcon: HiBriefcase, label: 'Jobs', badge: badgeCount },
      { path: '/worker/wallet', icon: IoWalletOutline, activeIcon: IoWallet, label: 'Wallet' },
      { path: '/worker/profile', icon: FiUser, activeIcon: HiUser, label: 'Profile' },
    ];
  }, [pendingJobsCount]);

  const handleNavClick = (path) => {
    if (location.pathname !== path) {
      navigate(path);
    }
  };

  // Hide nav when specific routes are active (booking alerts, maps)
  const hideNavRoutes = [
    '/worker/booking-alert/',
    '/worker/booking/',
    '/worker/booking-alert/',
    '/worker/booking/',
  ];

  const shouldHideNav = hideNavRoutes.some(route =>
    location.pathname.includes(route) &&
    (location.pathname.includes('/map') || location.pathname.includes('/alert/'))
  );

  // Publish the nav's real height (the page layout pads the bottom by exactly this much, so content
  // is never under the nav and there is no guessed gap). Same approach as the customer app's nav.
  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return undefined;
    const root = document.documentElement;
    const publish = () => root.style.setProperty('--bottom-nav-height', `${el.getBoundingClientRect().height}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--bottom-nav-height');
    };
  }, [shouldHideNav]);

  if (shouldHideNav) {
    return null;
  }

  return (
    <nav
      ref={navRef}
      data-bottom-nav
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]"
      style={{
        zIndex: 40,
        // The phone's bottom inset: keeps tabs comfortably above the system navigation bar or gesture pill
        paddingBottom: 'max(6px, calc(var(--safe-bottom, 0px) * 0.75))',
        willChange: 'transform',
        transform: 'translateZ(0)',
      }}
    >
      <div className="flex items-center justify-around px-2 pt-3 pb-1.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path === '/worker/dashboard' && (location.pathname === '/worker' || location.pathname === '/vendor'));
          const IconComponent = isActive ? item.activeIcon : item.icon;

          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className="flex flex-col items-center justify-center relative min-w-[64px] py-0.5 rounded-xl transition-all duration-200"
            >
              {/* Active Indicator Bar */}
              {isActive && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-[#163B66]"
                />
              )}

              <div className="relative z-10 flex flex-col items-center justify-center">
                <div className="relative mb-0.5">
                  <IconComponent
                    className={`w-[25px] h-[25px] transition-all duration-200 ${isActive ? 'text-[#163B66] scale-105' : 'text-slate-400 group-hover:text-slate-600'}`}
                  />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border-2 border-white shadow-xs z-50"
                    >
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[11px] leading-tight transition-colors duration-200 mt-0.5 ${isActive ? 'font-bold text-[#163B66]' : 'font-medium text-slate-500'}`}
                >
                  {item.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
});

BottomNav.displayName = 'BottomNav';
export default BottomNav;

