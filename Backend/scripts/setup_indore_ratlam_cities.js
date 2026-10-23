require('dotenv').config();
const mongoose = require('mongoose');
const City = require('../models/City');
const Category = require('../models/Category');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const indoreId = '6976e2d00c60bc69f3e168dc';

  // 1. Fix Indore
  const indore = await City.findByIdAndUpdate(
    indoreId,
    {
      $set: {
        name: 'Indore',
        slug: 'indore',
        state: 'Madhya Pradesh',
        country: 'India',
        isActive: true,
        isDefault: true
      }
    },
    { new: true, upsert: true }
  );
  console.log('Updated Indore City:', indore.name, `(${indore.state}) [${indore._id}]`);

  // 2. Add / Update Ratlam
  const ratlam = await City.findOneAndUpdate(
    { slug: 'ratlam' },
    {
      $set: {
        name: 'Ratlam',
        slug: 'ratlam',
        state: 'Madhya Pradesh',
        country: 'India',
        isActive: true,
        isDefault: false
      }
    },
    { new: true, upsert: true }
  );
  console.log('Upserted Ratlam City:', ratlam.name, `(${ratlam.state}) [${ratlam._id}]`);

  // 3. Ensure Kalaburagi has its own distinct slug if wanted
  await City.findOneAndUpdate(
    { slug: 'kalaburagi' },
    {
      $set: {
        name: 'Kalaburagi',
        slug: 'kalaburagi',
        state: 'Karnataka',
        country: 'India',
        isActive: true,
        isDefault: false
      }
    },
    { new: true, upsert: true }
  );
  console.log('Ensured Kalaburagi has separate document');

  // 4. Also enable all active categories for Ratlam and Indore
  const ratlamId = ratlam._id.toString();
  const allCats = await Category.find({ status: 'active' });
  let updatedCount = 0;
  for (const cat of allCats) {
    const existing = (cat.cityIds || []).map(id => id.toString());
    let changed = false;
    if (!existing.includes(indoreId)) {
      cat.cityIds.push(indore._id);
      changed = true;
    }
    if (!existing.includes(ratlamId)) {
      cat.cityIds.push(ratlam._id);
      changed = true;
    }
    if (changed) {
      await cat.save();
      updatedCount++;
    }
  }
  console.log(`Enabled ${updatedCount} categories for Indore and Ratlam`);

  const allCities = await City.find({}).lean();
  console.log('\nAll Available Cities in DB:');
  allCities.forEach(c => {
    console.log(`- ${c.name} (${c.state || 'India'}) | slug: ${c.slug} | Default: ${c.isDefault} | Active: ${c.isActive} [${c._id}]`);
  });

  process.exit(0);
}

run().catch(err => {
  console.error('Error setting up cities:', err);
  process.exit(1);
});
