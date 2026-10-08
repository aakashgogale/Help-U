import React from 'react';
import { useLocation } from 'react-router-dom';
import { useConfig } from '../../context/ConfigContext';
import MaintenanceScreen from './MaintenanceScreen';

/**
 * Maintenance Gate
 *
 * Replaces the user and partner apps with the maintenance screen while the
 * isUnderMaintenance flag is on.
 *
 * The admin panel is deliberately exempt: it is how maintenance gets turned back
 * off, so locking it would make the flag a one-way door. The backend middleware
 * leaves /api/admin open for the same reason.
 */
const MaintenanceGate = ({ children }) => {
  const { isUnderMaintenance } = useConfig();
  const { pathname } = useLocation();

  const isAdminRoute = pathname.startsWith('/admin');

  if (isUnderMaintenance && !isAdminRoute) {
    return <MaintenanceScreen />;
  }

  return children;
};

export default MaintenanceGate;
