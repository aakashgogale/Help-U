/**
 * Tests for the voice search engine (src/utils/voiceSearch.js) with simulated devices:
 *   - inside the Flutter app (native handler `voiceSearch`)
 *   - in a normal browser (Web Speech API)
 * No microphone is used. Run: node tests/voiceSearch.test.mjs   (or: npm run test:voice)
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(mkdtempSync(path.join(tmpdir(), 'voice-test-')), 'voiceSearch.mjs');
execFileSync(path.join(root, 'node_modules/.bin/esbuild'), [
  path.join(root, 'src/utils/voiceSearch.js'), '--bundle', '--format=esm', '--platform=node', `--outfile=${out}`, '--log-level=error'
]);

// ---- a swappable native bridge, in place BEFORE the engine loads (the bridge reads it once at load)
const native = { handler: async () => null, calls: [] };
globalThis.window = {
  flutter_inappwebview: {
    callHandler: (name, data) => { native.calls.push([name, data]); return native.handler(name, data); }
  },
  addEventListener() {}
};
const { startVoiceSearch, isVoiceSearchSupported, cleanTranscript, MESSAGES } = await import(pathToFileURL(out).href);

let ok = 0; let bad = 0;
const check = (name, cond, extra = '') => { cond ? ok++ : bad++; console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`); };
const asBrowser = (Recognition) => { window.flutter_inappwebview = undefined; window.webkitSpeechRecognition = Recognition; delete window.SpeechRecognition; };
const asFlutter = (handler) => { window.flutter_inappwebview = { callHandler: (n, d) => { native.calls.push([n, d]); return handler(n, d); } }; delete window.webkitSpeechRecognition; };

// A fake browser recogniser that plays a script when started
const fakeRecognition = (script) => class {
  constructor() { FakeInstance.last = this; }
  start() { this.started = true; setTimeout(() => script(this), 5); }
  abort() { this.aborted = true; setTimeout(() => this.onend && this.onend(), 1); }
};
const FakeInstance = { last: null };
const result = (text, isFinal) => ({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal })] });

console.log('\n== text tidy-up ==');
check('extra spaces and a trailing full stop are removed', cleanTranscript('  AC   repair. ') === 'AC repair');
check('nothing / null becomes an empty string', cleanTranscript(null) === '' && cleanTranscript(undefined) === '');
check('very long speech is cut to 80 characters', cleanTranscript('a'.repeat(200)).length === 80);

console.log('\n== browser (Web Speech API) ==');
asBrowser(fakeRecognition((r) => { r.onresult(result('washing', false)); r.onresult(result('washing machine repair', true)); r.onend(); }));
check('the mic is offered when the browser can listen', isVoiceSearchSupported() === true);
const heard = []; let s = startVoiceSearch({ onInterim: (t) => heard.push(t) }); let r = await s.promise;
check('a spoken phrase comes back', r.ok && r.text === 'washing machine repair', JSON.stringify(r));
check('live words are shown while speaking', heard[0] === 'washing' && heard.at(-1) === 'washing machine repair', heard.join(' | '));
check('it listens for Indian English, one phrase at a time', FakeInstance.last.lang === 'en-IN' && FakeInstance.last.continuous === false);

asBrowser(fakeRecognition((r2) => { r2.onerror({ error: 'no-speech' }); r2.onend(); }));
r = await startVoiceSearch().promise; check('silence -> "did not hear anything"', !r.ok && r.code === 'NO_SPEECH' && r.message === MESSAGES.NO_SPEECH);
asBrowser(fakeRecognition((r2) => { r2.onerror({ error: 'not-allowed' }); r2.onend(); }));
r = await startVoiceSearch().promise; check('blocked microphone -> permission message', !r.ok && r.code === 'PERMISSION_DENIED');
asBrowser(fakeRecognition((r2) => { r2.onerror({ error: 'service-not-allowed' }); r2.onend(); }));
r = await startVoiceSearch().promise; check('speech service blocked -> permission message', r.code === 'PERMISSION_DENIED');
asBrowser(fakeRecognition((r2) => { r2.onerror({ error: 'network' }); r2.onend(); }));
r = await startVoiceSearch().promise; check('no internet -> network message', r.code === 'NETWORK');
asBrowser(fakeRecognition((r2) => { r2.onerror({ error: 'audio-capture' }); r2.onend(); }));
r = await startVoiceSearch().promise; check('no microphone found -> not available', r.code === 'NOT_AVAILABLE');
asBrowser(fakeRecognition((r2) => { r2.onresult(result('ac repair', false)); r2.onend(); }));
r = await startVoiceSearch().promise; check('words heard but never finalised are still used', r.ok && r.text === 'ac repair');

asBrowser(fakeRecognition(() => {}));
s = startVoiceSearch(); await new Promise((res) => setTimeout(res, 20)); s.cancel(); r = await s.promise;
check('cancelling stops the microphone and returns no text', FakeInstance.last.aborted === true && !r.ok && r.code === 'CANCELLED');
asBrowser(class { start() { throw new Error('already started'); } });
r = await startVoiceSearch().promise; check('a recogniser that throws does not crash anything', !r.ok && r.code === 'UNKNOWN');

delete window.webkitSpeechRecognition; window.flutter_inappwebview = undefined;
check('no speech support at all -> the mic is hidden', isVoiceSearchSupported() === false);
r = await startVoiceSearch().promise; check('...and trying anyway gives a clear message', !r.ok && r.code === 'NOT_AVAILABLE');

console.log('\n== inside the Flutter app (native handler) ==');
native.calls.length = 0;
asFlutter(async () => ({ success: true, text: 'Washing machine repair.' }));
check('the mic is offered inside the app', isVoiceSearchSupported() === true);
r = await startVoiceSearch().promise;
check('the native result is used and tidied', r.ok && r.text === 'Washing machine repair', JSON.stringify(r));
check('the native handler is asked for Indian English', native.calls[0][0] === 'voiceSearch' && native.calls[0][1].locale === 'en_IN', JSON.stringify(native.calls[0]));
asFlutter(async () => null);
r = await startVoiceSearch().promise; check('an older app build without the handler -> "update the app"', !r.ok && r.code === 'APP_UPDATE' && /latest version/.test(r.message));
asFlutter(async () => ({ success: false, error: 'PERMISSION_DENIED' }));
r = await startVoiceSearch().promise; check('native: microphone permission denied', r.code === 'PERMISSION_DENIED');
asFlutter(async () => ({ success: false, error: 'NO_SPEECH' }));
r = await startVoiceSearch().promise; check('native: nothing heard', r.code === 'NO_SPEECH');
asFlutter(async () => ({ success: false, error: 'NOT_AVAILABLE' }));
r = await startVoiceSearch().promise; check('native: speech recognition unavailable', r.code === 'NOT_AVAILABLE');
asFlutter(async () => ({ success: false, error: 'NETWORK' }));
r = await startVoiceSearch().promise; check('native: no internet', r.code === 'NETWORK');
asFlutter(async () => ({ success: true, text: '   ' }));
r = await startVoiceSearch().promise; check('native: an empty result is "nothing heard", not a search', !r.ok && r.code === 'NO_SPEECH');
asFlutter(async () => { throw new Error('bridge exploded'); });
r = await startVoiceSearch().promise; check('native: a bridge error is handled', !r.ok && r.code === 'UNKNOWN');

native.calls.length = 0;
let release; asFlutter(async (name) => (name === 'voiceSearch' ? new Promise((res) => { release = res; }) : { success: true }));
s = startVoiceSearch(); await new Promise((res) => setTimeout(res, 10)); s.cancel();
await new Promise((res) => setTimeout(res, 10)); // the cancel message is sent asynchronously
check('cancelling tells the phone to stop listening', native.calls.some(([n]) => n === 'voiceSearchCancel'));
release({ success: true, text: 'late words' }); r = await s.promise;
check('words that arrive after cancelling are thrown away', !r.ok && r.code === 'CANCELLED');

console.log(`\nRESULT: ${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
