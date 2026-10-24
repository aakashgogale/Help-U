import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiLogOut } from 'react-icons/fi';
import useModalLock from '../../hooks/useModalLock';

/**
 * "Log out?" confirmation for the user and worker apps. Portaled above the bottom nav, locks the
 * page behind it, and shows a busy state while the sign-out finishes.
 */
const LogoutConfirm = ({ isOpen, onClose, onConfirm, accent = '#dc2626' }) => {
  const [busy, setBusy] = useState(false);
  const stayRef = useRef(null);

  useModalLock(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;
    stayRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, busy, onClose]);

  if (!isOpen) return null;

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-confirm-title"
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <FiLogOut className="w-6 h-6 text-red-500" />
        </div>
        <h3 id="logout-confirm-title" className="text-lg font-bold text-gray-900">Log out?</h3>
        <p className="text-sm text-gray-600 mt-1.5 mb-6">You'll need to sign in again to use your account.</p>
        <div className="flex gap-3">
          <button
            ref={stayRef}
            type="button"
            disabled={busy}
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-semibold border border-gray-200 text-gray-700 active:scale-95 transition-all disabled:opacity-60"
          >
            Stay logged in
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={confirm}
            className="flex-1 py-3 rounded-xl font-semibold text-white active:scale-95 transition-all disabled:opacity-60"
            style={{ background: accent }}
          >
            {busy ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LogoutConfirm;
