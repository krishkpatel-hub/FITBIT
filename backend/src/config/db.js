import mongoose from 'mongoose';

mongoose.set('sanitizeFilter', true);

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not configured');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed', { errorType: error.name });
    process.exit(1);
  }
};

export default connectDB;
