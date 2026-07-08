import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export async function connectMongoDB(): Promise<void> {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/volttticket';

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });

  logger.info('✅ MongoDB connected');
}
