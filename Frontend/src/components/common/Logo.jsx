import React, { forwardRef } from 'react';

/**
 * The worker app is branded "Help U Service Partner" and shows its own logo.
 * /vendor is the legacy path that redirects to /worker.
 */
export const isServicePartnerApp = () => {
  const path = window.location.pathname;
  return path.startsWith('/worker') || path.startsWith('/vendor');
};

export const getLogoSrc = () =>
  isServicePartnerApp() ? '/helpu-service-partner.png' : '/helpu-logo.png';

/**
 * Centralized Logo Component
 * Usage: <Logo className="h-12 w-auto" />
 * Supports ref for animations
 */
const Logo = forwardRef(({ className = "h-12 w-auto", ...props }, ref) => {
  return (
    <img
      ref={ref}
      src={getLogoSrc()}
      alt={isServicePartnerApp() ? 'Help U Service Partner' : 'Help U'}
      className={`${className} object-contain`}
      {...props}
    />
  );
});

Logo.displayName = 'Logo';

export default Logo;
