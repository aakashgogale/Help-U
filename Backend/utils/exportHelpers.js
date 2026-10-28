/**
 * Small pure helpers for the admin data exports (Excel and PDF). No database, no Express.
 */

const IST = 'Asia/Kolkata';
const dateFmt = new Intl.DateTimeFormat('en-GB', { timeZone: IST, day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: IST, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
});

const valid = (d) => d && !Number.isNaN(new Date(d).getTime());

/** "05 Oct 2026" in India time, or "" */
const istDate = (d) => (valid(d) ? dateFmt.format(new Date(d)) : '');
/** "05 Oct 2026, 14:30" in India time, or "" */
const istDateTime = (d) => (valid(d) ? dateTimeFmt.format(new Date(d)) : '');

const yesNo = (v) => (v ? 'Yes' : 'No');

/** A number rounded to paise; anything else becomes 0 */
const money = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

/**
 * Text that a spreadsheet would treat as a formula when someone edits the cell ("=…", "@…") or that starts
 * with a control character gets a leading apostrophe, so a name like "=HYPERLINK(...)" stays inert.
 * "+" and "-" are left alone because phone numbers (+91…) and negative values are normal.
 */
const safeCell = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v !== 'string') return v;
  return /^[=@\t\r]/.test(v) ? `'${v}` : v;
};

/** Keep only the last `keep` characters, hide the rest: "XXXXXX1234". Short or empty values are hidden fully. */
const maskTail = (value, keep = 4) => {
  const s = String(value || '').replace(/\s+/g, '');
  if (!s) return '';
  if (s.length <= keep) return 'X'.repeat(s.length);
  return 'X'.repeat(s.length - keep) + s.slice(-keep);
};

/** Aadhaar shown the way the UIDAI asks: "XXXX XXXX 1234". */
const maskAadhaar = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 12) return `XXXX XXXX ${digits.slice(-4)}`;
  return maskTail(value, 4);
};

/**
 * PDF's built-in fonts only draw basic Latin letters. Anything else (₹, Hindi, Kannada…) would come out as
 * rubbish, so it is shown as "?" and the page says so. The Excel file keeps the exact text.
 */
const WIN_ANSI_EXTRA = new Set('–—‘’“”•…€™'.split(''));
const pdfText = (value) => {
  const s = String(value === null || value === undefined ? '' : value).replace(/[\r\n\t]+/g, ' ');
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0);
    out += (code >= 32 && code <= 126) || (code >= 161 && code <= 255) || WIN_ANSI_EXTRA.has(ch) ? ch : '?';
  }
  return out;
};

/** Does pdfText() have to replace anything in this value? */
const needsPdfFallback = (value) => pdfText(value) !== String(value === null || value === undefined ? '' : value).replace(/[\r\n\t]+/g, ' ');

/** "2026-10-28" for file names, in India time */
const fileDate = (d = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: IST, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  return parts;
};

module.exports = { istDate, istDateTime, yesNo, money, safeCell, maskTail, maskAadhaar, pdfText, needsPdfFallback, fileDate };
