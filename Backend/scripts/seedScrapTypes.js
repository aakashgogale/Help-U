/**
 * Seed a starter set of scrap types (Admin > Scrap > Types & rates).
 *
 * The rates are PLACEHOLDERS in the range of typical Indian scrap-dealer prices. Review and set
 * your own rates in the admin page; every change there is kept in the rate history.
 *
 * Insert-only: a type whose slug already exists is skipped, so nothing an admin created or edited
 * is ever overwritten. Re-running it is safe.
 *
 *   node scripts/seedScrapTypes.js            # add the missing starter types
 *   node scripts/seedScrapTypes.js --dry-run  # show what would be added
 */
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ScrapType = require('../models/ScrapType');
const ScrapRateHistory = require('../models/ScrapRateHistory');
const { sanitizeDetailFields } = require('../utils/detailFields');

const DRY_RUN = process.argv.includes('--dry-run');

const metalCondition = {
  label: 'Condition',
  type: 'select',
  options: ['Clean', 'Mixed with other material', 'Rusty'],
  required: false,
  helpText: 'Clean metal gets the best rate.'
};

const applianceFields = [
  { label: 'Brand', type: 'text', placeholder: 'e.g. LG, Voltas', required: false },
  { label: 'Working condition', type: 'select', options: ['Working', 'Not working'], required: true },
  { label: 'Approximate age', type: 'select', options: ['Under 5 years', '5 to 10 years', 'Over 10 years'], required: false }
];

// name, group, unit, rate (per unit), minimum quantity, what is accepted, photo required, questions
const TYPES = [
  // Metals (priced per kg)
  { name: 'Iron', group: 'Metals', unit: 'kg', rate: 30, min: 5, info: 'Iron and steel pieces, grills, pipes, tools and machine parts.', fields: [metalCondition] },
  { name: 'Steel', group: 'Metals', unit: 'kg', rate: 45, min: 2, info: 'Stainless steel utensils, sinks and fittings. Magnets do not stick to stainless steel.', fields: [] },
  { name: 'Aluminium', group: 'Metals', unit: 'kg', rate: 110, min: 1, info: 'Clean aluminium sheets, utensils, window frames and cables. No painted or rusted pieces.', fields: [metalCondition] },
  { name: 'Copper', group: 'Metals', unit: 'kg', rate: 650, min: 0.5, info: 'Copper wire, pipes and sheets. Stripped wire gets a better rate than wire with insulation.', fields: [{ label: 'Wire or other?', type: 'select', options: ['Wire', 'Pipe or sheet', 'Mixed'], required: false }] },
  { name: 'Brass', group: 'Metals', unit: 'kg', rate: 420, min: 0.5, info: 'Brass utensils, taps and fittings.', fields: [] },

  // Paper (priced per kg)
  { name: 'Newspaper & Paper', group: 'Paper & Plastic', unit: 'kg', rate: 13, min: 5, info: 'Newspapers, magazines, books and office paper. Keep it dry.', fields: [] },
  { name: 'Cardboard', group: 'Paper & Plastic', unit: 'kg', rate: 9, min: 5, info: 'Cardboard boxes and cartons. Flatten them and keep them dry.', fields: [] },
  { name: 'Plastic', group: 'Paper & Plastic', unit: 'kg', rate: 12, min: 3, info: 'Hard plastic items, bottles, buckets and containers.', fields: [] },

  // Appliances and electronics (no fixed rate: the admin quotes after seeing the photos)
  { name: 'Old AC', group: 'Appliances', mode: 'quote', min: 1, info: 'Split or window AC. We quote a price after seeing the photos.', photo: true, fields: applianceFields },
  { name: 'Old Fridge', group: 'Appliances', mode: 'quote', min: 1, info: 'Refrigerators of any size. We quote a price after seeing the photos.', photo: true, fields: applianceFields },
  { name: 'Old Washing Machine', group: 'Appliances', mode: 'quote', min: 1, info: 'Top or front loading. We quote a price after seeing the photos.', photo: true, fields: applianceFields },
  { name: 'Other appliance or electronics', group: 'Appliances', mode: 'quote', min: 1, info: 'Cooler, microwave, TV, computer, inverter and more. Add a photo and the brand.', photo: true, fields: applianceFields }
];

const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  let added = 0;
  let skipped = 0;

  for (const [index, t] of TYPES.entries()) {
    const slug = slugify(t.name);
    if (await ScrapType.exists({ slug })) {
      console.log(`  skip   ${t.name} (already exists)`);
      skipped++;
      continue;
    }

    const isQuote = t.mode === 'quote';
    const { fields, error } = sanitizeDetailFields(t.fields);
    if (error) throw new Error(`${t.name}: ${error}`);

    const doc = {
      name: t.name,
      slug,
      group: t.group,
      info: t.info,
      pricingMode: isQuote ? 'quote' : 'per_unit',
      unit: isQuote ? 'piece' : t.unit,
      ratePerUnit: isQuote ? 0 : t.rate,
      minQuantity: t.min,
      requiresPhoto: !!t.photo,
      detailFields: fields,
      isActive: true,
      order: index,
      rateUpdatedAt: isQuote ? null : new Date()
    };

    console.log(`  add    ${t.name.padEnd(32)} ${isQuote ? 'quoted by admin' : `₹${t.rate}/${t.unit}`}`);
    added++;
    if (DRY_RUN) continue;

    const created = await ScrapType.create(doc);
    if (!isQuote) await ScrapRateHistory.create({ scrapTypeId: created._id, rate: t.rate, previousRate: null });
  }

  console.log(`\n${DRY_RUN ? 'Would add' : 'Added'} ${added}, skipped ${skipped}.`);
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('FAILED:', err.message);
    process.exit(1);
  });
