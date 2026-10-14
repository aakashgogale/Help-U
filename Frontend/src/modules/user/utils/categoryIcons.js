// Vector category illustrations in public/ServiceIcon (same style as water-heater.svg).
// Shared by the home category grid and booking cards so a category looks the same everywhere.
// Bump when the SVG files change so browsers don't keep showing cached copies
const ICON_VERSION = 2;

export const getCategoryIllustration = (title) => {
  if (!title) return null;
  const t = title.toLowerCase();
  const origin = window.location.origin;
  const file = (name) => `${origin}/ServiceIcon/${name}?v=${ICON_VERSION}`;
  if (t.includes('refrigerator') || t.includes('fridge')) return file('refrigerator.svg');
  if (t.includes('water heater') || t.includes('geyser')) return file('water-heater.svg');
  if (t.includes('microwave')) return file('microwave.svg');
  if (t.includes('r.o') || t.includes('purifier') || t.includes('prufier')) return file('ro-purifier.svg');
  if (t.includes('led') || t.includes('tv')) return file('led-tv.svg');
  if (t.includes('dish washer') || t.includes('dishwasher')) return file('dishwasher.svg');
  if (t.includes('chimney')) return file('chimney.svg');
  if (t.includes('cooler')) return file('cooler.svg');
  if (t.includes('washing machine')) return file('washing-machine.svg');
  if (t.includes('ac ') || t === 'ac') return file('ac.svg');
  return null;
};
