import { useEffect } from 'react';

// Ref-counted so stacked modals don't unlock the page while another is still open.
let openModals = 0;

/**
 * While `active` is true: the page behind the modal stops scrolling and the
 * bottom navigation is hidden (see `html.has-modal` in index.css).
 */
const useModalLock = (active) => {
  useEffect(() => {
    if (!active) return undefined;
    const html = document.documentElement;
    const body = document.body;
    if (openModals === 0) {
      html.dataset.prevOverflow = html.style.overflow;
      body.dataset.prevOverflow = body.style.overflow;
      html.dataset.prevGutter = html.style.scrollbarGutter;
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      // Keep the scrollbar's space reserved so hiding it does not shift the page sideways
      html.style.scrollbarGutter = 'stable';
      html.classList.add('has-modal');
    }
    openModals += 1;

    return () => {
      openModals = Math.max(0, openModals - 1);
      if (openModals === 0) {
        html.style.overflow = html.dataset.prevOverflow || '';
        body.style.overflow = body.dataset.prevOverflow || '';
        html.style.scrollbarGutter = html.dataset.prevGutter || '';
        delete html.dataset.prevGutter;
        delete html.dataset.prevOverflow;
        delete body.dataset.prevOverflow;
        html.classList.remove('has-modal');
      }
    };
  }, [active]);
};

export default useModalLock;
