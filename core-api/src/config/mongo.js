import mongoose from 'mongoose';
import config from './config.js';
import { getSecret } from './utils/keyVault.js';

const connectMongo = async () => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  let mongoUri;

  try {
    // First try local env (for development)
    if (process.env.MONGO_URI || process.env.MONGO_URL) {
      mongoUri = process.env.MONGO_URI || process.env.MONGO_URL;
      console.log("ℹ️ Using local environment Mongo URI");
    } else {
      // Otherwise fetch from Azure Key Vault
      console.log("🔐 Fetching Mongo URI from Azure Key Vault...");
      mongoUri = await getSecret("MONGO_URI");
    }

    if (!mongoUri) {
      throw new Error("Mongo URI is empty");
    }

    await mongoose.connect(mongoUri, {
      autoIndex: config.mongoose.autoIndex,
    });

    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};

export default connectMongo;