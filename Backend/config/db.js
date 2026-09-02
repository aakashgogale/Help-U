const dns = require('node:dns');
const mongoose = require('mongoose');

const configureDnsForMongoSrv = (mongoUri) => {
  if (!mongoUri || !mongoUri.startsWith('mongodb+srv://')) {
    return;
  }

  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
    console.log('Using custom DNS servers for MongoDB SRV lookup');
  } catch (error) {
    console.warn('Failed to configure custom DNS servers:', error.message);
  }
};

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error('MONGODB_URI is not set');
    }

    configureDnsForMongoSrv(mongoUri);

    const conn = await mongoose.connect(mongoUri);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

