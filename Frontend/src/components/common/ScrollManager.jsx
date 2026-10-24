import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const STORAGE_KEY = 'scrollPositions';

const readPositions = () => {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
};
const writePosition = (key, y) => {
  try {
    const all = readPositions();
    all[key] = y;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch { /* storage unavailable: restoration just won't happen */ }
};

/**
 * SPA scroll handling:
 *  - new pages (push) start at the top, instantly
 *  - going back (pop) returns to exactly where the page was left, instantly. Lazy pages render
 *    a moment after navigation, so the restore retries until the page is tall enough.
 * Render once inside <BrowserRouter>.
 */
const ScrollManager = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const lastY = useRef(0);

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    const onScroll = () => { lastY.current = window.scrollY; };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const key = location.key;

    let frame = 0;
    let cancelled = false;
    const stop = () => { cancelled = true; };
    const userEvents = ['wheel', 'touchstart', 'keydown'];

    if (navigationType === 'POP') {
      const target = readPositions()[key] || 0;
      const attempt = () => {
        if (cancelled) return;
        window.scrollTo({ top: target, left: 0, behavior: 'instant' });
        const reached = Math.abs(window.scrollY - target) <= 2;
        if (!reached && frame < 60) {
          frame += 1;
          requestAnimationFrame(attempt);
        }
      };
      userEvents.forEach((ev) => window.addEventListener(ev, stop, { passive: true, once: true }));
      requestAnimationFrame(attempt);
    } else if (!location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }

    return () => {
      stop();
      userEvents.forEach((ev) => window.removeEventListener(ev, stop));
      // Remember where this page was left (captured from scroll events, before the next page resets it)
      writePosition(key, lastY.current);
    };
  }, [location.key, location.hash, navigationType]);

  return null;
};

export default ScrollManager;
