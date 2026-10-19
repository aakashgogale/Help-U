const dns = require('node:dns');
const mongoose = require('mongoose');

const configureDnsForMongoSrv = (mongoUri) => {
  if (!mongoUri || !mongoUri.startsWith('mongodb+srv://')) {
    return;
  }

  try {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    console.log('[MongoDB] Using custom DNS servers (8.8.8.8, 1.1.1.1) for SRV resolution');
  } catch (error) {
    console.warn('[MongoDB] Failed to configure custom DNS servers:', error.message);
  }
};

/**
 * Connect to MongoDB with automatic retry and resilient settings
 */
const connectDB = async (maxRetries = 3, retryDelayMs = 2500) => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('[MongoDB] Error: MONGODB_URI is not set in environment variables');
    process.exit(1);
  }

  // Pre-configure DNS servers before any SRV lookup
  configureDnsForMongoSrv(mongoUri);

  const connectionOptions = {
    serverSelectionTimeoutMS: 20000,
    socketTimeoutMS: 45000,
    family: 4 // Force IPv4 to avoid Windows IPv6 resolution timeouts
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`[MongoDB] Retry attempt ${attempt}/${maxRetries}...`);
      }
      const conn = await mongoose.connect(mongoUri, connectionOptions);
      console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.warn(`[MongoDB] Connection attempt ${attempt}/${maxRetries} failed: ${error.message}`);

      if (attempt < maxRetries) {
        console.log(`[MongoDB] Waiting ${retryDelayMs / 1000}s before retrying...`);
        // Refresh DNS configuration before retry
        configureDnsForMongoSrv(mongoUri);
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      } else {
        console.error('\n================ MongoDB Connection Failed ================');
        console.error('Could not connect to MongoDB Atlas after multiple attempts.');
        console.error('Common causes:');
        console.error('  1. IP Whitelist: Ensure your current public IP is added in MongoDB Atlas -> Network Access.');
        console.error('     (Or add 0.0.0.0/0 for development access)');
        console.error('  2. Network / Firewall: Check if port 27017 or outbound DNS is restricted.');
        console.error('  3. Database credentials: Verify username/password in .env');
        console.error('===========================================================\n');
        process.exit(1);
      }
    }
  }
};

module.exports = connectDB;

