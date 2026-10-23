require('dotenv').config();
const mongoose = require('mongoose');
const UserService = require('../models/UserService');
const Brand = require('../models/Brand');
const Category = require('../models/Category');
const City = require('../models/City');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const cities = await City.find({ isActive: true }).lean();
  console.log('Active Cities:', cities.map(c => `${c.name} (${c.state}) [${c._id}]`));

  const cityIds = cities.map(c => c._id);

  const catRes = await Category.updateMany(
    { status: 'active' },
    { $addToSet: { cityIds: { $each: cityIds } } }
  );
  console.log('Categories updated with active cities:', catRes.modifiedCount);

  const servRes = await UserService.updateMany(
    { status: 'active' },
    { $addToSet: { cityIds: { $each: cityIds } } }
  );
  console.log('Services updated with active cities:', servRes.modifiedCount);

  const brandRes = await Brand.updateMany(
    { isActive: { $ne: false } },
    { $addToSet: { cityIds: { $each: cityIds } } }
  );
  console.log('Brands updated with active cities:', brandRes.modifiedCount);

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
