const mongoose = require('mongoose');
require('dotenv').config();
const Category = require('../models/Category');

async function checkSpecificSlugs() {
  await mongoose.connect(process.env.MONGODB_URI);
  const slugs = [
    'plumber', 'carpenter', 'furniture-assembly', 'womens-spa', 
    'hair-studio', 'mens-massage', 'ac-repair', 'washing-machine', 
    'fridge', 'geyser', 'cooler', 'microwave', 'ro-prufier', 'kitchen-chimney'
  ];
  const found = await Category.find({ slug: { $in: slugs } }).select('title slug parentId').lean();
  console.log('Found slugs:', found.map(f => `${f.slug} (title: ${f.title}, parentId: ${f.parentId})`));
  process.exit(0);
}
checkSpecificSlugs().catch(err => {
  console.error(err);
  process.exit(1);
});
