/**
 * Voice search engine (no React in here, so it can be tested on its own).
 *
 * Two ways to hear the user:
 *  1. Inside the Flutter app: the native handler `voiceSearch` (the browser's speech recognition does not
 *     work inside an Android web view). `voiceSearchCancel` stops it.
 *  2. In a normal browser: the Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 *
 * startVoiceSearch() returns { promise, cancel }. The promise NEVER rejects; it resolves to
 *   { ok: true, text }                      what the user said
 *   { ok: false, code, message }            why nothing came back (see MESSAGES)
 */
import flutterBridge from './flutterBridge';

// Service names in the catalog are English, and so is the search, so the speech is recognised as
// Indian English (it also copes with the way people mix Hindi words into English).
export const VOICE_LOCALE = 'en-IN';

// How long we wait for the whole attempt before giving up
const MAX_LISTEN_MS = 20000;

export const MESSAGES = {
  PERMISSION_DENIED: 'Microphone access is blocked. Allow the microphone for Help U in your phone settings, then try again.',
  NO_SPEECH: 'We did not hear anything. Tap the mic and say a service, for example “AC repair”.',
  NOT_AVAILABLE: 'Voice search is not available on this phone right now. You can type your search instead.',
  APP_UPDATE: 'Voice search needs the latest version of the Help U app. Please update the app, or type your search.',
  NETWORK: 'Voice search needs an internet connection. Check your connection and try again.',
  UNKNOWN: 'Voice search did not work this time. Please try again.'
};

const fail = (code) => ({ ok: false, code, message: MESSAGES[code] || MESSAGES.UNKNOWN });

/** Tidy what was heard: single spaces, no trailing full stop, a sensible length. */
export const cleanTranscript = (text) =>
  String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.。]+$/g, '')
    .trim()
    .slice(0, 80);

const insideFlutter = () => typeof window !== 'undefined' && Boolean(window.flutter_inappwebview);

const webRecognitionCtor = () =>
  (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) || null;

/** Can this device do voice search at all? (Used to decide whether to show the mic.) */
export const isVoiceSearchSupported = () => insideFlutter() || Boolean(webRecognitionCtor());

/* ------------------------------ native (Flutter) ------------------------------ */

const NATIVE_CODES = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NO_SPEECH: 'NO_SPEECH',
  NOT_AVAILABLE: 'NOT_AVAILABLE',
  NETWORK: 'NETWORK',
  USER_CANCELLED: 'CANCELLED'
};

const nativeSession = (locale) => {
  let cancelled = false;
  const promise = (async () => {
    const res = await flutterBridge.callHandler('voiceSearch', { locale: locale.replace('-', '_') });
    if (cancelled) return fail('CANCELLED');

    const text = cleanTranscript(res && res.text);
    if (res && res.success && text) return { ok: true, text };

    // An older app build has no `voiceSearch` handler: the call resolves to nothing at all.
    if (res === null || res === undefined) return fail('APP_UPDATE');
    return fail(NATIVE_CODES[res.error] || (res.success ? 'NO_SPEECH' : 'UNKNOWN'));
  })().catch(() => fail('UNKNOWN'));

  return {
    promise,
    cancel: () => {
      cancelled = true;
      flutterBridge.callHandler('voiceSearchCancel').catch(() => {});
    }
  };
};

/* ------------------------------ browser (Web Speech API) ------------------------------ */

const WEB_ERROR_CODES = {
  'not-allowed': 'PERMISSION_DENIED',
  'service-not-allowed': 'PERMISSION_DENIED',
  'no-speech': 'NO_SPEECH',
  'audio-capture': 'NOT_AVAILABLE',
  'language-not-supported': 'NOT_AVAILABLE',
  network: 'NETWORK',
  aborted: 'CANCELLED'
};

const webSession = (Ctor, locale, onInterim) => {
  let recognition;
  let cancelled = false;
  let finalText = '';
  let interimText = '';
  let errorCode = null;

  const promise = new Promise((resolve) => {
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    try {
      recognition = new Ctor();
      recognition.lang = locale;
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        let finals = '';
        let interims = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) finals += piece;
          else interims += piece;
        }
        if (finals) finalText = `${finalText} ${finals}`.trim();
        interimText = interims;
        if (onInterim) onInterim(cleanTranscript(`${finalText} ${interimText}`));
      };
      recognition.onerror = (event) => {
        errorCode = WEB_ERROR_CODES[event.error] || 'UNKNOWN';
      };
      recognition.onend = () => {
        if (cancelled) return done(fail('CANCELLED'));
        const text = cleanTranscript(finalText || interimText);
        if (text) return done({ ok: true, text });
        return done(fail(errorCode && errorCode !== 'CANCELLED' ? errorCode : 'NO_SPEECH'));
      };
      recognition.start();
    } catch (err) {
      done(fail('UNKNOWN'));
    }
  });

  return {
    promise,
    cancel: () => {
      cancelled = true;
      try { recognition && recognition.abort(); } catch (err) { /* already stopped */ }
    }
  };
};

/* ------------------------------ public entry ------------------------------ */

export const startVoiceSearch = ({ onInterim, locale = VOICE_LOCALE } = {}) => {
  const Ctor = webRecognitionCtor();
  let session;

  if (insideFlutter()) {
    session = nativeSession(locale);
  } else if (Ctor) {
    session = webSession(Ctor, locale, onInterim);
  } else {
    return { promise: Promise.resolve(fail('NOT_AVAILABLE')), cancel: () => {} };
  }

  // Safety net: never leave the mic open. If it fires, that is "heard nothing", not "cancelled by the user".
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    session.cancel();
  }, MAX_LISTEN_MS);
  const promise = session.promise.then((result) => {
    clearTimeout(timer);
    return timedOut && !result.ok && result.code === 'CANCELLED' ? fail('NO_SPEECH') : result;
  });

  return {
    promise,
    cancel: () => {
      clearTimeout(timer);
      session.cancel();
    }
  };
};
