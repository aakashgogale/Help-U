// Winter illustrations in public/services/winter, matched to a service by its name.
// Order matters: "water heater" must win over the generic "heater".
const WINTER_ARTWORK = [
  { pattern: /water heater|geyser|boiler/i, file: 'water-heater-repair.svg' },
  { pattern: /\btap\b|faucet|plumb|leak|pipe/i, file: 'tap-repair.svg' },
  { pattern: /heater|blower|radiator/i, file: 'room-heater.svg' },
  { pattern: /switch|socket|board|wiring|electric|mcb/i, file: 'switch-socket.svg' },
];

// Bump when the artwork files change so browsers don't keep showing cached copies
const ARTWORK_VERSION = 3;

export const WINTER_FALLBACK_ARTWORK = `/services/winter/winter-service.svg?v=${ARTWORK_VERSION}`;

export const isWinterSection = (title) => /winter|snow|cold/i.test(title || '');

export const getWinterArtwork = (serviceTitle) => {
  const match = WINTER_ARTWORK.find(({ pattern }) => pattern.test(serviceTitle || ''));
  return match ? `/services/winter/${match.file}?v=${ARTWORK_VERSION}` : null;
};
