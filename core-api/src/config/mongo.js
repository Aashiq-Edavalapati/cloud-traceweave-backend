import mongoose from 'mongoose';
import config from './config.js';

const connectMongo = async () => {
  console.log('🔍 Checking MongoDB connection state...');
  console.log('Current readyState:', mongoose.connection.readyState);

  if (mongoose.connection.readyState >= 1) {
    console.log('⚠️ MongoDB already connected or connecting.');
    return;
  }

  console.log('🔍 Reading environment variables...');

  const mongoUri = process.env.MONGO_URI || process.env.MONGO_URL;

  console.log('MONGO_URI:', process.env.MONGO_URI ? '✅ Found' : '❌ Not Found');
  console.log('MONGO_URL:', process.env.MONGO_URL ? '✅ Found' : '❌ Not Found');

  if (!mongoUri) {
    console.error('❌ MONGO_URI or MONGO_URL is not defined in environment variables');

    console.log('🔍 Environment variables containing MONGO / URI / URL:');
    console.log(
      Object.keys(process.env).filter(
        (k) => k.includes('MONGO') || k.includes('URI') || k.includes('URL')
      )
    );

    process.exit(1);
  }

  console.log('🔍 Mongo URI detected.');
  console.log('Mongo URI (masked):', mongoUri.replace(/\/\/.*@/, '//***:***@'));

  console.log('🔍 Mongoose config:', config.mongoose);

  try {
    console.log('⏳ Attempting MongoDB connection...');

    await mongoose.connect(mongoUri, {
      autoIndex: config.mongoose.autoIndex,
    });

    console.log('✅ MongoDB Atlas Connected (Logs & History)');
    console.log('📡 Host:', mongoose.connection.host);
    console.log('📂 Database:', mongoose.connection.name);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    console.error('Full error object:', error);
    process.exit(1);
  }
};

export default connectMongo;
