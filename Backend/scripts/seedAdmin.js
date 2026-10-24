const dotenv = require('dotenv');
const connectDB = require('../config/db');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');

dotenv.config();

const seedAdmin = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Credentials come from the environment (ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD). Without a password a
    // random one is generated and shown once. An existing admin is never touched unless
    // --reset-password is passed explicitly.
    const email = (process.env.ADMIN_SEED_EMAIL || 'admin@helpu.local').toLowerCase();
    const generated = !process.env.ADMIN_SEED_PASSWORD;
    const password = process.env.ADMIN_SEED_PASSWORD || require('crypto').randomBytes(12).toString('base64url');

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      if (!process.argv.includes('--reset-password')) {
        console.log(`⚠️  Admin ${email} already exists. Nothing changed (pass --reset-password to reset it).`);
        return;
      }
      existingAdmin.password = password;
      existingAdmin.role = 'super_admin';
      existingAdmin.isActive = true;
      await existingAdmin.save();
      console.log(`✅ Password reset for ${email}${generated ? `: ${password}` : ' (from ADMIN_SEED_PASSWORD)'}\n`);
      return;
    }

    // Create admin user
    const adminData = {
      name: 'Super Admin',
      email,
      password, // Plain text, let model pre-save hook hash it
      role: 'super_admin',
      isActive: true,
      permissions: {
        users: { read: true, write: true, delete: true },
        workers: { read: true, write: true, delete: true },
        bookings: { read: true, write: true, delete: true },
        payments: { read: true, write: true, delete: true },
        categories: { read: true, write: true, delete: true },
        services: { read: true, write: true, delete: true },
        homeContent: { read: true, write: true, delete: true },
        notifications: { read: true, write: true, delete: true },
        reports: { read: true, write: true, delete: true },
        settings: { read: true, write: true, delete: true }
      }
    };

    const admin = await Admin.create(adminData);
    console.log('✅ Admin user created successfully!');
    console.log(`📧 Email: ${email}`);
    console.log(generated ? `🔑 Password (shown once): ${password}` : '🔑 Password: from ADMIN_SEED_PASSWORD');
    console.log('🌐 Login URL: http://localhost:5173/admin/login\n');

    console.log('🔒 Important: Change the default password after first login!\n');

  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  } finally {
    // Close database connection
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run seed script
seedAdmin();





