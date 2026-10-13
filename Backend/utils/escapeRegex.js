// Escapes regex special characters so user-supplied search text is matched
// literally instead of being interpreted as a pattern — prevents ReDoS from
// crafted input (e.g. "(a+)+") and invalid-pattern crashes from new RegExp().
const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = escapeRegex;
