import mongoose from 'mongoose';
import { config } from './index.js';

export const connectDB = async (): Promise<void> => {
  try {
    if (!config.mongoUri) {
      console.log('[Xabarchi DB] MongoUri is not defined, using local fallback mode.');
      return;
    }
    await mongoose.connect(config.mongoUri);
    console.log('[Xabarchi DB] MongoDB muvaffaqiyatli ulandi! 🍃');
  } catch (error) {
    console.warn('[Xabarchi DB] MongoDB ulanishida ogohlantirish (fallback ishlatiladi):', error);
  }
};
