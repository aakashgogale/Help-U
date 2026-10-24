import { useEffect } from 'react';
import toast, { useToasterStore } from 'react-hot-toast';

/**
 * Keeps at most `limit` toasts on screen: when a new one arrives, older visible
 * toasts are dismissed. Render once, next to <Toaster />.
 */
const ToastLimiter = ({ limit = 1 }) => {
  const { toasts } = useToasterStore();

  useEffect(() => {
    // The store lists the newest toast first
    toasts
      .filter((t) => t.visible)
      .slice(limit)
      .forEach((t) => toast.dismiss(t.id));
  }, [toasts, limit]);

  return null;
};

export default ToastLimiter;
