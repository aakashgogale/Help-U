import React, { useEffect, useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const STORAGE_KEYS = {
  user: { tokenKey: 'accessToken', refreshTokenKey: 'refreshToken', dataKey: 'userData' },
  worker: { tokenKey: 'workerAccessToken', refreshTokenKey: 'workerRefreshToken', dataKey: 'workerData' },
  admin: { tokenKey: 'adminAccessToken', refreshTokenKey: 'adminRefreshToken', dataKey: 'adminData' },
};

const DEFAULT_REDIRECTS = {
  user: '/user/login',
  worker: '/worker/login',
  admin: '/admin/login'
};

const readStored = (key) => sessionStorage.getItem(key) || localStorage.getItem(key);

/**
 * Decide auth from the stored session. This is synchronous (storage + token decode),
 * so the route renders immediately instead of flashing a loading screen on every navigation.
 * Returns 'authenticated' | 'expired' | 'unauthenticated'.
 */
const evaluateAuth = ({ tokenKey, refreshTokenKey, dataKey }, userType) => {
  const token = readStored(tokenKey);
  const userData = readStored(dataKey);
  if (!token || !userData) return 'unauthenticated';

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return 'unauthenticated';

    const payload = JSON.parse(atob(parts[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp > currentTime) return 'authenticated';

    // Access token expired but a refresh token exists: let the api.js interceptor refresh it
    // on the first request instead of logging out aggressively here.
    if (readStored(refreshTokenKey)) {
      console.log(`[Auth] Access token expired for ${userType}, but refresh token exists. Proceeding...`);
      return 'authenticated';
    }
    return 'expired';
  } catch (error) {
    console.error('Token validation error:', error);
    return 'unauthenticated';
  }
};

/**
 * Protected Route Component
 * Checks if user is authenticated before allowing access
 */
const ProtectedRoute = ({ children, userType = 'user', redirectTo = null }) => {
  const location = useLocation();
  const keys = STORAGE_KEYS[userType] || STORAGE_KEYS.user;

  // Re-evaluated on every navigation, as before
  const status = useMemo(() => evaluateAuth(keys, userType), [keys, userType, location.pathname]);

  // Truly expired session with no way to refresh: clear the stored auth data
  useEffect(() => {
    if (status !== 'expired') return;
    console.log('Session truly expired, clearing auth data');
    [keys.tokenKey, keys.refreshTokenKey, keys.dataKey].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  }, [status, keys]);

  if (status !== 'authenticated') {
    const redirectPath = redirectTo || DEFAULT_REDIRECTS[userType] || '/user/login';
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
