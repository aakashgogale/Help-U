const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Vendor = require('../models/Vendor');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const Category = require('../models/Category');
const { VENDOR_STATUS, BOOKING_STATUS, PAYMENT_STATUS, USER_ROLES } = require('../utils/constants');
const { uploadFile } = require('../services/fileStorageService');

require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/Homster');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedVendors = async () => {
  try {
    console.log('Starting vendor seeding...');

    // Clear existing data
    await Vendor.deleteMany({});
    console.log('Cleared existing vendor data');

    // Get electrician category
    const electricianCategory = await Category.findOne({ title: 'Electricity' });
    if (!electricianCategory) {
      console.log('Electricity category not found, creating it...');
      const newCategory = new Category({
        title: 'Electricity',
        slug: 'electricity',
        iconUrl: 'https://res.cloudinary.com/shubhamcloudinary/image/upload/v1766039523/icons/services/electrician.png',
        homeIconUrl: 'https://res.cloudinary.com/shubhamcloudinary/image/upload/v1766039523/icons/services/electrician.png',
        description: 'Electrical services and repairs',
        isActive: true,
        homeOrder: 1
      });
      await newCategory.save();
    }

    const category = await Category.findOne({ title: 'Electricity' });

    // Create sample vendors
    const vendorsData = [
      {
        name: 'Rajesh Kumar',
        email: 'rajesh.kumar@helpu.com',
        phone: '9876543210',
        password: 'vendor123',
        businessName: 'Kumar Electrical Services',
        service: 'Electricity',
        approvalStatus: VENDOR_STATUS.APPROVED,
        isPhoneVerified: true,
        isEmailVerified: true,
        address: {
          addressLine1: '123 MG Road',
          addressLine2: 'Near City Mall',
          city: 'Indore',
          state: 'Madhya Pradesh',
          pincode: '452001',
          landmark: 'Opposite HDFC Bank'
        },
        wallet: {
          balance: 25000
        },
        profilePhoto: null
      },
      {
        name: 'Amit Sharma',
        email: 'amit.sharma@helpu.com',
        phone: '9876543211',
        password: 'vendor123',
        businessName: 'Sharma Home Services',
        service: 'Electricity',
        approvalStatus: VENDOR_STATUS.APPROVED,
        isPhoneVerified: true,
        isEmailVerified: true,
        address: {
          addressLine1: '456 Vijay Nagar',
          addressLine2: 'Scheme 78',
          city: 'Indore',
          state: 'Madhya Pradesh',
          pincode: '452010',
          landmark: 'Near Apollo Hospital'
        },
        wallet: {
          balance: 18000
        },
        profilePhoto: null
      },
      {
        name: 'Vikram Singh',
        email: 'vikram.singh@helpu.com',
        phone: '9876543212',
        password: 'vendor123',
        businessName: 'Singh Electrical Solutions',
        service: 'Electricity',
        approvalStatus: VENDOR_STATUS.APPROVED,
        isPhoneVerified: true,
        isEmailVerified: true,
        address: {
          addressLine1: '789 Palasia',
          addressLine2: 'AB Road',
          city: 'Indore',
          state: 'Madhya Pradesh',
          pincode: '452001',
          landmark: 'Near Treasure Island Mall'
        },
        wallet: {
          balance: 32000
        },
        profilePhoto: null
      }
    ];

    const createdVendors = [];
    for (const vendorData of vendorsData) {
      const vendor = new Vendor(vendorData);
      await vendor.save();
      createdVendors.push(vendor);
      console.log(`Created vendor: ${vendor.name}`);
    }

    console.log(`Seeded ${createdVendors.length} vendors successfully!`);
    console.log('Vendor seeding completed!');

  } catch (error) {
    console.error('Error seeding vendors:', error);
  }
};

// Run the seeding
const runSeeding = async () => {
  await connectDB();
  await seedVendors();
  process.exit(0);
};

runSeeding();

