// Vector category illustrations in public/ServiceIcon and public/categories.
// Shared by the home category grid, cart, and booking cards so a category looks the same everywhere.
// Bump when the SVG files change so browsers don't keep showing cached copies
const ICON_VERSION = 7;

export const getCategoryIllustration = (title) => {
  if (!title) return null;
  const t = title.toLowerCase().trim();
  const origin = window.location.origin;
  const file = (name) => `${origin}/ServiceIcon/${name}?v=${ICON_VERSION}`;
  const catFile = (name) => `${origin}/categories/${name}?v=${ICON_VERSION}`;

  // Combined parent category: Electrician, Plumber & Carpenter
  if (t.includes('electric') && (t.includes('plumb') || t.includes('carpent'))) {
    return catFile('electrician.svg');
  }

  // Specific Subcategory: Plumber
  if (t.includes('plumb') || t.includes('tap') || t.includes('pipe') || t.includes('drain') || t.includes('flush')) {
    return catFile('plumber-toilet.svg');
  }

  // Specific Subcategory: Carpenter
  if (t.includes('carpent') || t.includes('door') || t.includes('lock') || t.includes('handle')) {
    return catFile('carpenter-door.svg');
  }

  // Specific Subcategory: Furniture Assembly
  if (t.includes('furniture') || t.includes('assembly') || t.includes('bed assembly') || t.includes('table assembly')) {
    return catFile('furniture-assembly.svg');
  }

  // Specific Subcategory: Electrician
  if (t.includes('electric') || t.includes('switch') || t.includes('socket') || t.includes('switchboard') || t.includes('wiring') || t.includes('mcb')) {
    return catFile('electrician-switch.svg');
  }

  // Cleaning subcategories
  if (t.includes('bathroom') || t.includes('kitchen cleaning') || t.includes('washroom') || t.includes('sink')) {
    return catFile('bathroom-sink.svg');
  }
  if (t.includes('sofa') || t.includes('carpet')) {
    return catFile('sofa-cleaning.svg');
  }
  if ((t.includes('clean') || t.includes('pest')) && !t.includes('tank') && !t.includes('car')) {
    return catFile('cleaning.svg');
  }

  // Salon & Spa: Women's Salon & Spa parent and salon items must use the 3D Avatar (womens-salon.png)
  if ((t.includes('women') || t.includes('woman')) && (t.includes('salon') || t.includes('beauty'))) {
    return catFile('womens-salon.png');
  }
  // Men's Salon & Massage parent and salon items must use the 3D Avatar (mens-salon.png)
  if ((t.includes('men') || t.includes('man')) && (t.includes('salon') || t.includes('grooming') || t.includes('barber'))) {
    return catFile('mens-salon.png');
  }

  // Men's specific grooming items
  if ((t.includes('men') || t.includes('man') || t.includes('beard') || t.includes('shave')) && (t.includes('hair') || t.includes('cut') || t.includes('beard') || t.includes('styling'))) {
    return '/services/mens-salon/haircut.jpg';
  }
  if ((t.includes('men') || t.includes('man')) && t.includes('massage')) {
    return '/services/mens-salon/massage.jpg';
  }
  if ((t.includes('men') || t.includes('man')) && (t.includes('detan') || t.includes('facial'))) {
    return '/services/mens-salon/detan-facial.jpg';
  }

  // Specific Subcategory: Spa for Women (standalone)
  if (t.includes('spa')) {
    return catFile('spa-women.svg');
  }
  // Specific Subcategory: Hair Studio for Women
  if (t.includes('hair') && !t.includes('men')) {
    return catFile('hair-dryer.svg');
  }
  // Specific Subcategory: Massage for Men (standalone)
  if (t.includes('massage')) {
    return '/services/mens-salon/massage.jpg';
  }

  // Painting
  if (t.includes('paint') || t.includes('waterproof') || t.includes('colour') || t.includes('color')) {
    return catFile('painting.png');
  }

  // Vehicle Washing & Car/Bike Wash
  if (t.includes('bike') && t.includes('wash')) {
    return catFile('bike-wash.png');
  }
  if (t.includes('vehicle') || t.includes('car wash') || t.includes('car-wash') || (t.includes('car') && t.includes('clean'))) {
    return catFile('vehicle-washing.png');
  }

  // Nail Art & Extensions
  if (t.includes('nail')) {
    return catFile('nail-art.png');
  }

  // CCTV & Security
  if (t.includes('cctv') || t.includes('surveillance') || (t.includes('security') && !t.includes('deposit'))) {
    return catFile('cctv.png');
  }

  // Water Tank
  if (t.includes('tank')) {
    return catFile('water-tank.png');
  }

  // Appliances
  if (t.includes('refrigerator') || t.includes('fridge')) return file('refrigerator.svg');
  if (t.includes('water heater') || t.includes('geyser')) return file('water-heater.svg');
  if (t.includes('microwave')) return file('microwave.svg');
  if (t.includes('r.o') || t.includes('purifier') || t.includes('prufier')) return file('ro-purifier.svg');
  if (t.includes('led') || t.includes('tv')) return file('led-tv.svg');
  if (t.includes('dish washer') || t.includes('dishwasher')) return file('dishwasher.svg');
  if (t.includes('chimney')) return file('chimney.svg');
  if (t.includes('cooler')) return file('cooler.svg');
  if (t.includes('washing machine')) return file('washing-machine.svg');
  if (t.includes('ac ') || t === 'ac' || t.includes('air condition') || t.includes('ac & appliance')) return file('ac.svg');

  return null;
};
