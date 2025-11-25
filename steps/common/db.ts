import mongoose from 'mongoose';

let isConnected = false;

export const connectToDatabase = async () => {
  if (isConnected) {
    console.log('=> using existing database connection');
    return;
  }

  if (!process.env.MONGODB_URL) {
    throw new Error('MONGODB_URL environment variable is not defined');
  }

  console.log('=> using new database connection');
  try {
    const db = await mongoose.connect(process.env.MONGODB_URL);
    isConnected = db.connections[0].readyState === 1;
    console.log('=> database connected');
  } catch (error) {
    console.error('=> error connecting to database:', error);
    throw error;
  }
};
