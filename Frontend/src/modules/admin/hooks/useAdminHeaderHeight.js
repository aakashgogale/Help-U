import { useState, useEffect } from 'react';

/**
 * Height of the fixed admin header, used as top padding for the page content on mobile.
 *
 * It watches the header's own size (ResizeObserver) rather than every DOM change inside it: dropdowns,
 * dialogs and animations living in the header used to trigger a re-measure on each frame, which made
 * the screen flicker.
 */
const findHeader = () =>
  document.querySelector('header[class*="fixed"][class*="top-0"]') || document.querySelector('header.fixed');

const useAdminHeaderHeight = () => {
  const [headerHeight, setHeaderHeight] = useState(72); // sensible default until measured

  useEffect(() => {
    const header = findHeader();
    if (!header) return undefined;

    const measure = () => setHeaderHeight(header.offsetHeight);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return headerHeight;
};

export default useAdminHeaderHeight;
