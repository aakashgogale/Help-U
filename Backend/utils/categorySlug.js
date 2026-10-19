/**
 * Category slug helpers.
 *
 * Category.slug has a GLOBAL unique index, so a sub-category can't reuse a
 * top-level slug. We enforce namespacing in app-code: a sub-category's slug
 * must start with its parent's slug followed by a single hyphen. The parent
 * slug itself is reserved and may never be used verbatim for a child.
 *
 * This helper is intentionally stand-alone — it doesn't touch Mongoose, so
 * admin controllers, migrations and seed scripts can all reuse it without
 * circular imports. Callers that want DB-level uniqueness checks keep using
 * the existing Category.findOne({ slug }) pattern.
 */

/**
 * Normalise a free-text title to a lowercase, hyphenated slug segment.
 * Keeps the behaviour identical to the pre-validate hook in Category.js so
 * admin-side previews match what a server-side save would produce.
 */
const toSlugSegment = (text = '') =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '');

/**
 * Build a namespaced sub-category slug from its parent slug and the
 * sub-category's own title or raw tail. The returned slug is always of the
 * form `<parentSlug>-<tail>` and never equals the parent slug alone.
 *
 * Examples:
 *   buildSubCategorySlug('womens-salon', 'Waxing & threading')
 *     -> 'womens-salon-waxing-threading'
 *   buildSubCategorySlug('ac-repair', 'packages')
 *     -> 'ac-repair-packages'
 */
const buildSubCategorySlug = (parentSlug, titleOrTail) => {
  const parent = toSlugSegment(parentSlug);
  const tail = toSlugSegment(titleOrTail);
  if (!parent) throw new Error('buildSubCategorySlug: parent slug is required');
  if (!tail) throw new Error('buildSubCategorySlug: sub-category title/tail is required');
  if (tail === parent) {
    throw new Error('buildSubCategorySlug: child slug cannot equal parent slug');
  }
  // If the admin pasted a tail that already begins with the parent prefix,
  // don't double it (e.g. parent "ac-repair" + tail "ac-repair-packages").
  if (tail === `${parent}-${parent}` || tail.startsWith(`${parent}-`)) {
    return tail;
  }
  return `${parent}-${tail}`;
};

/**
 * Validate a candidate sub-category slug against its intended parent slug.
 * Returns { ok, reason } so controllers can surface a specific error without
 * guessing.
 *
 * - ok:false 'parent-required' when parentSlug is empty
 * - ok:false 'slug-required' when the child slug is empty
 * - ok:false 'equals-parent' when the child slug equals the parent slug
 * - ok:false 'missing-prefix' when the child slug doesn't start with
 *                             '<parentSlug>-'
 * - ok:false 'bad-format' when the child slug contains invalid characters
 * - ok:true otherwise
 */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const validateSubCategorySlug = (parentSlug, childSlug) => {
  const parent = String(parentSlug || '').toLowerCase();
  const child = String(childSlug || '').toLowerCase();

  if (!parent) return { ok: false, reason: 'parent-required' };
  if (!child) return { ok: false, reason: 'slug-required' };
  if (!SLUG_RE.test(child)) return { ok: false, reason: 'bad-format' };
  if (child === parent) return { ok: false, reason: 'equals-parent' };
  if (!child.startsWith(`${parent}-`)) return { ok: false, reason: 'missing-prefix' };
  // The suffix after the prefix must itself be non-empty and valid.
  const suffix = child.slice(parent.length + 1);
  if (!suffix || !SLUG_RE.test(suffix)) return { ok: false, reason: 'bad-format' };

  return { ok: true };
};

/**
 * Human-readable error message for a validateSubCategorySlug reason. Used
 * by controllers to pass straight to the admin UI without a lookup table at
 * the call site.
 */
const subCategorySlugError = (reason, { parentSlug } = {}) => {
  switch (reason) {
    case 'parent-required': return 'A parent category is required to build a sub-category slug.';
    case 'slug-required':   return 'Sub-category slug is required.';
    case 'equals-parent':   return 'Sub-category slug cannot equal the parent slug.';
    case 'missing-prefix':  return `Sub-category slug must start with the parent slug prefix "${parentSlug || 'parent'}-".`;
    case 'bad-format':      return 'Slug may contain only lowercase letters, digits and hyphens, with no leading, trailing or consecutive hyphens.';
    default:                return 'Invalid sub-category slug.';
  }
};

module.exports = {
  toSlugSegment,
  buildSubCategorySlug,
  validateSubCategorySlug,
  subCategorySlugError
};
