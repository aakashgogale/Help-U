/**
 * Service Detail Content
 *
 * Normalises the optional detail fields (warranty, policy, inclusions,
 * exclusions, FAQs) before they reach the database.
 *
 * The admin UI sends these as free text, so the input is cleaned here rather
 * than trusted: list entries arrive either as an array or as newline-separated
 * text, blank rows are dropped, and an FAQ missing a question or an answer is
 * discarded instead of being stored half-filled.
 */

const MAX_LIST_ITEMS = 30;
const MAX_FAQS = 30;
const MAX_TEXT = 2000;

/**
 * Accepts an array of strings or a newline-separated string.
 * Returns a trimmed array with blanks removed.
 */
const toList = (value) => {
  if (value === undefined || value === null) return undefined;

  let items;
  if (Array.isArray(value)) {
    items = value;
  } else if (typeof value === 'string') {
    items = value.split('\n');
  } else {
    return [];
  }

  return items
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .slice(0, MAX_LIST_ITEMS);
};

/**
 * Keeps only entries that have both a question and an answer.
 */
const toFaqs = (value) => {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) return [];

  return value
    .map((faq) => ({
      question: String(faq?.question ?? '').trim(),
      answer: String(faq?.answer ?? '').trim()
    }))
    .filter((faq) => faq.question && faq.answer)
    .slice(0, MAX_FAQS);
};

const toText = (value) => {
  if (value === undefined || value === null) return undefined;
  return String(value).trim().slice(0, MAX_TEXT);
};

/**
 * Builds a patch of only the detail fields present in the payload, so a caller
 * that omits them leaves the stored values untouched.
 */
const buildServiceContent = (body = {}) => {
  const patch = {};

  const warranty = toText(body.warranty);
  if (warranty !== undefined) patch.warranty = warranty;

  const cancellationPolicy = toText(body.cancellationPolicy);
  if (cancellationPolicy !== undefined) patch.cancellationPolicy = cancellationPolicy;

  const inclusions = toList(body.inclusions);
  if (inclusions !== undefined) patch.inclusions = inclusions;

  const exclusions = toList(body.exclusions);
  if (exclusions !== undefined) patch.exclusions = exclusions;

  const faqs = toFaqs(body.faqs);
  if (faqs !== undefined) patch.faqs = faqs;

  return patch;
};

module.exports = { buildServiceContent, toList, toFaqs, toText };
