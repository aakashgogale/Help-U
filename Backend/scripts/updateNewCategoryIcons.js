const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { uploadFile } = require('../services/cloudinaryService');

const uploads = [
  { slug: 'painting', file: '../../Frontend/public/categories/painting.png', publicId: 'painting_3d' },
  { slug: 'vehicle-washing', file: '../../Frontend/public/categories/vehicle-washing.png', publicId: 'vehicle_washing_3d' },
  { slug: 'vehicle-washing-car-wash', file: '../../Frontend/public/categories/car-wash.png', publicId: 'car_wash_3d' },
  { slug: 'vehicle-washing-bike-wash', file: '../../Frontend/public/categories/bike-wash.png', publicId: 'bike_wash_3d' },
  { slug: 'nail-art-extensions', file: '../../Frontend/public/categories/nail-art.png', publicId: 'nail_art_3d' },
  { slug: 'cctv-services', file: '../../Frontend/public/categories/cctv.png', publicId: 'cctv_security_3d' },
  { slug: 'water-tank-cleaning', file: '../../Frontend/public/categories/water-tank.png', publicId: 'water_tank_3d' },
  { slug: 'cleaning-water-tank-cleaning', file: '../../Frontend/public/categories/water-tank.png', publicId: 'water_tank_3d' }
];

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Category = mongoose.model('Category', new mongoose.Schema({}, { strict: false }));

    console.log('--- Uploading to Cloudinary & Updating DB ---');
    for (const item of uploads) {
      const fullPath = path.resolve(__dirname, item.file);
      const buf = fs.readFileSync(fullPath);
      const uploadRes = await uploadFile(buf, {
        folder: 'categories',
        public_id: item.publicId,
        overwrite: true
      });

      const localUrl = `/categories/${path.basename(item.file)}`;
      const cldUrl = uploadRes.success ? uploadRes.url : localUrl;
      console.log(`✅ Uploaded ${item.slug}: ${cldUrl}`);

      // We set homeIconUrl to localUrl (e.g. /categories/painting.png) so it always loads locally fast and clean, and imageUrl to cldUrl
      const updated = await Category.updateMany(
        { slug: item.slug },
        {
          $set: {
            homeIconUrl: localUrl,
            imageUrl: cldUrl,
            'heroBanner.imageUrl': cldUrl
          }
        }
      );
      console.log(`   Updated DB matches for ${item.slug}: ${updated.modifiedCount}`);
    }

    // Also update any child category or variant with painting or car-wash
    await Category.updateMany(
      { slug: 'painting-wall-painting' },
      { $set: { homeIconUrl: '/categories/painting.png', imageUrl: '/categories/painting.png' } }
    );
    await Category.updateMany(
      { slug: 'painting-waterproofing' },
      { $set: { homeIconUrl: '/categories/painting.png', imageUrl: '/categories/painting.png' } }
    );
    await Category.updateMany(
      { slug: 'nail-art-extensions-nail-art' },
      { $set: { homeIconUrl: '/categories/nail-art.png', imageUrl: '/categories/nail-art.png' } }
    );
    await Category.updateMany(
      { slug: 'cctv-services-installation-repair' },
      { $set: { homeIconUrl: '/categories/cctv.png', imageUrl: '/categories/cctv.png' } }
    );

    console.log('--- Done Updating Database ---');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

run();
