import { useState, useRef, useCallback, useEffect } from 'react';
import { startVoiceSearch, isVoiceSearchSupported } from '../utils/voiceSearch';
import flutterBridge from '../utils/flutterBridge';

/**
 * React wrapper around the voice search engine (utils/voiceSearch.js).
 *
 *   const voice = useVoiceSearch({ onResult: (text) => ... });
 *   voice.supported   show the mic only when true
 *   voice.start()     start listening (opens the sheet)
 *   voice.cancel()    stop and close
 *   voice.status      'idle' | 'listening' | 'error'
 *   voice.interim     the words heard so far (browsers only; the phone returns the whole phrase at the end)
 *   voice.error       { code, message } while status is 'error'
 */
const useVoiceSearch = ({ onResult } = {}) => {
  const [status, setStatus] = useState('idle');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState(null);
  const [supported, setSupported] = useState(() => isVoiceSearchSupported());
  const sessionRef = useRef(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  // The Flutter bridge can finish loading after the first render
  useEffect(() => {
    const refresh = () => setSupported(isVoiceSearchSupported());
    refresh();
    window.addEventListener('flutterInAppWebViewPlatformReady', refresh);
    return () => window.removeEventListener('flutterInAppWebViewPlatformReady', refresh);
  }, []);

  const cancel = useCallback(() => {
    if (sessionRef.current) sessionRef.current.cancel();
    sessionRef.current = null;
    setStatus('idle');
    setInterim('');
    setError(null);
  }, []);

  const start = useCallback(async () => {
    if (sessionRef.current) return; // already listening
    setError(null);
    setInterim('');
    setStatus('listening');
    if (window.flutter_inappwebview) flutterBridge.hapticFeedback('light').catch(() => {}); // a small tap inside the app

    const session = startVoiceSearch({ onInterim: setInterim });
    sessionRef.current = session;
    const result = await session.promise;
    if (sessionRef.current !== session) return; // cancelled while we were waiting
    sessionRef.current = null;

    if (result.ok) {
      setStatus('idle');
      setInterim('');
      if (onResultRef.current) onResultRef.current(result.text);
    } else if (result.code === 'CANCELLED') {
      setStatus('idle');
      setInterim('');
    } else {
      setStatus('error');
      setError(result);
    }
  }, []);

  // Never leave the microphone open if the screen goes away
  useEffect(() => () => {
    if (sessionRef.current) sessionRef.current.cancel();
  }, []);

  return { supported, status, interim, error, start, cancel, isOpen: status !== 'idle' };
};

export default useVoiceSearch;
