import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiShoppingCart, FiUser, FiTrash2, FiCalendar } from 'react-icons/fi';
import { HiHome, HiShoppingCart, HiUser, HiTrash, HiCalendar } from 'react-icons/hi';
import { motion } from 'framer-motion';
import { useCart } from '../../../../context/CartContext';
import { useConfig } from '../../../../context/ConfigContext';

const BottomNav = React.memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount } = useCart();
  const { isScrapEnabled } = useConfig();
  const navRef = useRef(null);

  // Publish the nav's real height so floating UI (e.g. the live booking card) can sit
  // exactly above it instead of relying on a hard-coded offset.
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
  }, []);

  const navItems = useMemo(() => {
    const items = [
      { id: 'home', label: 'Home', icon: FiHome, filledIcon: HiHome, path: '/user' },
      { id: 'bookings', label: 'Bookings', icon: FiCalendar, filledIcon: HiCalendar, path: '/user/my-bookings' },
      ...(isScrapEnabled ? [{ id: 'scrap', label: 'Scrap', icon: FiTrash2, filledIcon: HiTrash, path: '/user/scrap' }] : []),
      { id: 'cart', label: 'Cart', icon: FiShoppingCart, filledIcon: HiShoppingCart, path: '/user/cart', isCart: true },
      { id: 'account', label: 'Account', icon: FiUser, filledIcon: HiUser, path: '/user/account' },
    ];
    return items;
  }, [isScrapEnabled]);

  const getActiveTab = () => {
    if (location.pathname === '/user' || location.pathname === '/user/') return 'home';
    if (location.pathname === '/user/my-bookings') return 'bookings';
    if (location.pathname === '/user/scrap') return 'scrap';
    if (location.pathname === '/user/cart') return 'cart';
    if (location.pathname === '/user/account') return 'account';
    return 'home';
  };

  const activeTab = getActiveTab();

  const handleTabClick = (path) => {
    navigate(path);
  };

  return (
    <nav
      ref={navRef}
      data-bottom-nav
      className="fixed bottom-0 left-0 right-0 z-40 w-full lg:hidden px-3 pt-1.5 bg-white/60 border-t border-gray-200/60"
      style={{
        // The whole band is a frosted, tappable-blocking layer: content scrolling underneath
        // is blurred and cannot be hit through the gaps around the floating dock.
        backdropFilter: 'blur(18px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(18px) saturate(1.4)',
        WebkitBackfaceVisibility: 'hidden',
        paddingBottom: 'max(8px, var(--safe-bottom))',
      }}
    >
      <div
        className="max-w-md mx-auto rounded-[26px] px-2 py-1.5 bg-white/95 border border-gray-100"
        style={{
          boxShadow: '0 6px 22px -8px rgba(15, 27, 45, 0.2)',
        }}
      >
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const IconComponent = isActive ? item.filledIcon : item.icon;

            return (
              <motion.button
                key={item.id}
                type="button"
                onClick={() => handleTabClick(item.path)}
                whileTap={{ scale: 0.92 }}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className="relative flex flex-col items-center justify-center flex-1 max-w-[88px] h-[52px] rounded-[16px]"
              >
                {/* Active pill */}
                {isActive && (
                  <motion.div
                    layoutId="user-bottom-nav-pill"
                    className="absolute inset-0 rounded-[16px] bg-accent-soft"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}

                <div className="relative z-10 flex flex-col items-center justify-center">
                  <div className="relative mb-0.5">
                    <IconComponent
                      className={`w-6 h-6 transition-colors duration-200 ${isActive ? 'text-accent' : 'text-gray-500'}`}
                    />
                    {item.isCart && cartCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2.5 bg-accent text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center ring-2 ring-white"
                      >
                        {cartCount > 9 ? '9+' : cartCount}
                      </motion.span>
                    )}
                  </div>
                  <span
                    className={`text-[11px] leading-none transition-colors duration-200 ${isActive ? 'text-accent font-semibold' : 'text-gray-500 font-medium'}`}
                  >
                    {item.label}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
});

BottomNav.displayName = 'BottomNav';

export default BottomNav;
