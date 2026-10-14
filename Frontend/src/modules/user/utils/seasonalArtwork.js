// Images for themed home sections (public/services/<theme>), matched to a service by
// its name: illustrations for winter, real photos for electrical. A section gets a theme
// from its admin title; cards whose name matches nothing keep the admin-uploaded image.

// Bump when the artwork files change so browsers don't keep showing cached copies
const ARTWORK_VERSION = 4;

const THEMES = {
  winter: {
    match: /winter|snow|cold/i,
    fallback: 'winter-service.svg',
    // Order matters: "water heater" must win over the generic "heater"
    items: [
      { pattern: /water heater|geyser|boiler/i, file: 'water-heater-repair.svg' },
      { pattern: /\btap\b|faucet|plumb|leak|pipe/i, file: 'tap-repair.svg' },
      { pattern: /heater|blower|radiator/i, file: 'room-heater.svg' },
      { pattern: /switch|socket|board|wiring|electric|mcb/i, file: 'switch-socket.svg' },
    ],
  },
  electrical: {
    match: /electric/i, // also matches the admin spelling "Electricial"
    fallback: 'electrician.jpg', // real photos for this section
    items: [
      { pattern: /wiring|wire|cable/i, file: 'home-wiring.jpg' },
      { pattern: /\bfan/i, file: 'fan-repair.jpg' },
      { pattern: /inverter|invertor|\bups\b|battery|stabili[sz]er/i, file: 'inverter.jpg' },
      { pattern: /\bmcb\b|\bdb\b|distribution|breaker|fuse|panel/i, file: 'mcb.jpg' },
      { pattern: /switch|socket|plug|board/i, file: 'switch-socket.jpg' },
      { pattern: /expert|electrician|book|visit/i, file: 'electrician.jpg' },
    ],
  },
};

const url = (theme, file) => `/services/${theme}/${file}?v=${ARTWORK_VERSION}`;

/** Theme for a home section from its admin title, or null */
export const getSectionArtTheme = (sectionTitle) =>
  Object.keys(THEMES).find(theme => THEMES[theme].match.test(sectionTitle || '')) || null;

/** Illustration for a service in a themed section, or null when nothing matches */
export const getSectionArtwork = (theme, serviceTitle) => {
  const match = THEMES[theme]?.items.find(({ pattern }) => pattern.test(serviceTitle || ''));
  return match ? url(theme, match.file) : null;
};

/** Generic illustration for the theme, used if a card's own image fails to load */
export const getSectionArtworkFallback = (theme) => (THEMES[theme] ? url(theme, THEMES[theme].fallback) : null);
