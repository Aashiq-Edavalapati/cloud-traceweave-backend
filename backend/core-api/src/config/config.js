import dotenv from 'dotenv';
import path from 'path';

// Load .env from root or specific folder
dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
};