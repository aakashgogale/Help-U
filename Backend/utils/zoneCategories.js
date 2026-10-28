const Category = require('../models/Category');

/**
 * The categories a zone really covers, as a Set of id strings.
 *
 * An admin picks categories for a zone, but customers move through two levels: the parent on the
 * home grid and its tiles (sub-categories) below it. So:
 *   - allowing a parent also allows every sub-category under it
 *   - allowing a sub-category keeps its parent reachable, so the tile can be found
 * Returns null when the zone has no restriction (an empty list means "everything").
 */
const expandZoneCategories = async (allowedCategories) => {
  if (!Array.isArray(allowedCategories) || allowedCategories.length === 0) return null;

  const ids = allowedCategories.map((c) => String(c?._id || c));
  const set = new Set(ids);

  const [children, picked] = await Promise.all([
    Category.find({ parentId: { $in: ids } }).select('_id').lean(),
    Category.find({ _id: { $in: ids } }).select('parentId').lean()
  ]);
  children.forEach((c) => set.add(String(c._id)));
  picked.forEach((c) => { if (c.parentId) set.add(String(c.parentId)); });
  return set;
};

module.exports = { expandZoneCategories };
