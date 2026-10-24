// Helpers that turn the public category list (roots + sub-categories, as stored by
// the admin) into what the user app renders. Nothing here is hard-coded: titles,
// icons, ordering and grouping all come from the category documents.

export const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = url.replace('/api/upload', '/upload');
  if (clean.startsWith('/') || clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}/${clean}`;
};

export const readStoredCoords = () => {
  try {
    const raw = localStorage.getItem('userCoords');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.lat === 'number' && typeof parsed?.lng === 'number') return parsed;
  } catch { /* ignore */ }
  return null;
};

const idOf = (c) => String(c.id || c._id);

const byHomeOrder = (a, b) =>
  (a.homeOrder || 0) - (b.homeOrder || 0) || String(a.title || '').localeCompare(String(b.title || ''));

const isVisible = (c) => c.showOnHome !== false;

/** Top-level categories shown on Home, in the admin's order. */
export const getRootCategories = (categories) =>
  (Array.isArray(categories) ? categories : []).filter((c) => !c.parentId && isVisible(c)).sort(byHomeOrder);

/**
 * One section per visible top-level category, with its visible sub-categories as items.
 * A top-level category without sub-categories is a section of one item (itself), so
 * every category is reachable and nothing needs a "misc" bucket.
 */
export const buildCategorySections = (categories) => {
  const list = Array.isArray(categories) ? categories : [];
  return getRootCategories(list).map((root) => {
    const children = list
      .filter((c) => c.parentId && String(c.parentId) === idOf(root) && isVisible(c))
      .sort(byHomeOrder);
    return {
      id: idOf(root),
      title: root.title,
      root,
      hasChildren: children.length > 0,
      items: children.length > 0 ? children : [root]
    };
  });
};
