import React from 'react';
import { useLocation } from 'react-router-dom';

/**
 * PageTransition - swaps pages immediately with a short opacity fade-in.
 * Opacity only (no transform), so fixed/sticky elements inside pages keep working.
 */
const PageTransition = ({ children }) => {
  const location = useLocation();

  return (
    <div key={location.pathname} className="animate-page-in">
      {children}
    </div>
  );
};

export default PageTransition;
