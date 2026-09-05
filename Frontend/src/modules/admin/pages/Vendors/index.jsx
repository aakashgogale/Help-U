import React from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiUsers,
  FiBriefcase,
  FiActivity,
  FiDollarSign,
  FiChevronRight,
  FiGift
} from 'react-icons/fi';

// Import sub-components
import AllVendors from './AllVendors';
import VendorBookings from './VendorBookings';
import VendorAnalytics from './VendorAnalytics';
import VendorReferrals from './VendorReferrals';

const Vendors = () => {
  const location = useLocation();

  const navTabs = [
    { name: 'All Workers', path: '/admin/workers/all', icon: FiUsers },
    { name: 'Worker Bookings', path: '/admin/workers/bookings', icon: FiBriefcase },
    { name: 'Worker Referrals', path: '/admin/workers/referrals', icon: FiGift },
    { name: 'Worker Analytics', path: '/admin/workers/analytics', icon: FiActivity },
  ];

  const getPageTitle = () => {
    const currentTab = navTabs.find(tab => location.pathname === tab.path || location.pathname.startsWith(tab.path));
    return currentTab ? currentTab.name : 'Worker Management';
  };

  return (
    <div className="space-y-6">
      {/* Page Content */}
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Routes>
          <Route path="/" element={<Navigate to="all" replace />} />
          <Route path="all" element={<AllVendors />} />
          <Route path="bookings" element={<VendorBookings />} />
          <Route path="referrals" element={<VendorReferrals />} />
          <Route path="analytics" element={<VendorAnalytics />} />
        </Routes>
      </motion.div>
    </div>
  );
};

export default Vendors;
