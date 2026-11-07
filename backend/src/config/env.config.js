// Environment configuration skeleton
import dotenv from 'dotenv';
dotenv.config();

export const envConfig = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL,
  AI_SERVICE_URL: process.env.AI_SERVICE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  MAPS_API_KEY: process.env.MAPS_API_KEY,
};
