import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMic, FiMicOff, FiX } from 'react-icons/fi';
import useModalLock from '../../../../../hooks/useModalLock';
import flutterBridge from '../../../../../utils/flutterBridge';

/**
 * The "Listening…" sheet for voice search. The state comes from useVoiceSearch().
 * `onTypeInstead` is offered when listening fails (it opens the normal search box).
 */
const VoiceSearchSheet = ({ voice, onTypeInstead }) => {
  const { isOpen, status, interim, error, start, cancel } = voice;
  useModalLock(isOpen);

  const listening = status === 'listening';

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[10100] flex items-end justify-center bg-black/45"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={cancel}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Voice search"
            className="w-full max-w-lg bg-white rounded-t-3xl px-6 pt-5 text-center shadow-2xl"
            style={{ paddingBottom: 'max(1.5rem, var(--safe-bottom))' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />

            {listening ? (
              <>
                <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
                  {[0, 1].map((i) => (
                    <motion.span
                      key={i}
                      className="absolute inset-0 rounded-full bg-accent/25"
                      animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.7, ease: 'easeOut' }}
                    />
                  ))}
                  <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white shadow-lg">
                    <FiMic className="h-7 w-7" />
                  </span>
                </div>

                <p className="mt-7 min-h-[2rem] text-xl font-bold text-ink" aria-live="polite">
                  {interim ? `“${interim}”` : 'Listening…'}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {interim ? 'Keep going, or stop talking to search' : 'Say the service you need, for example “AC repair”'}
                </p>

                <button
                  type="button"
                  onClick={cancel}
                  className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 active:scale-95"
                >
                  <FiX className="h-4 w-4" /> Cancel
                </button>
              </>
            ) : (
              <>
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-500">
                  <FiMicOff className="h-8 w-8" />
                </div>
                <p className="mt-4 text-lg font-bold text-ink">Could not hear you</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-gray-500" aria-live="polite">
                  {error?.message}
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  {/* Blocked microphone inside the app: take the user straight to the phone's settings for Help U */}
                  {error?.code === 'PERMISSION_DENIED' && typeof window !== 'undefined' && window.flutter_inappwebview && (
                    <button
                      type="button"
                      onClick={() => { cancel(); flutterBridge.openAppSettings(); }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white active:scale-95"
                    >
                      Open settings
                    </button>
                  )}
                  {error?.code !== 'PERMISSION_DENIED' && error?.code !== 'APP_UPDATE' && error?.code !== 'NOT_AVAILABLE' && (
                    <button
                      type="button"
                      onClick={start}
                      className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white active:scale-95"
                    >
                      <FiMic className="h-4 w-4" /> Try again
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { cancel(); if (onTypeInstead) onTypeInstead(); }}
                    className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 active:scale-95"
                  >
                    Type instead
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default VoiceSearchSheet;
