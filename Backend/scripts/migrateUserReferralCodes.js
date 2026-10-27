const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const User = require('../models/User');

const run = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    const filter = {
      $or: [
        { referralCode: { $exists: false } },
        { referralCode: null },
        { referralCode: '' }
      ]
    };

    const usersWithoutCode = await User.find(filter).select('_id name phone');
    console.log(`Found ${usersWithoutCode.length} users without referralCode.`);

    let updatedCount = 0;
    for (const user of usersWithoutCode) {
      let uniqueCode = null;
      let attempts = 0;
      while (!uniqueCode && attempts < 10) {
        const candidate = User.generateReferralCode();
        const exists = await User.exists({ referralCode: candidate });
        if (!exists) {
          uniqueCode = candidate;
        }
        attempts++;
      }

      if (!uniqueCode) {
        console.error(`Failed to generate unique code for user ${user._id} after 10 attempts.`);
        continue;
      }

      await User.findByIdAndUpdate(user._id, { referralCode: uniqueCode });
      updatedCount++;
      console.log(`[${updatedCount}/${usersWithoutCode.length}] Assigned ${uniqueCode} to ${user.name || user.phone || user._id}`);
    }

    console.log(`\nSuccessfully backfilled referral codes for ${updatedCount} users.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

run();
