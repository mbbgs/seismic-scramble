require('dotenv').config();
const mongoose = require('mongoose');

async function connectToDb() {
  try {
    const { MONGODB_URI, NODE_ENV } = process.env;
    
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    const options = {
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      family: 4,
      serverSelectionTimeoutMS: 9000,
      heartbeatFrequencyMS: 30000,
      autoIndex: false,
      retryWrites: true,
    };
    
    await mongoose.connect(MONGODB_URI, options);
    
    if (NODE_ENV !== 'production') {
      mongoose.set('debug', true);
    }
    
    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      setTimeout(() => {
        console.log('Attempting to reconnect to MongoDB...');
        mongoose.connect(MONGODB_URI, options).catch(err => {
          console.error('Reconnection failed:', err);
        });
      }, 5000);
    });
    
    mongoose.connection.on('connected', () => {
      console.log('Connected to MongoDB with pool size:', options.maxPoolSize);
    });
    
    
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to application termination');
      process.exit(0);
    });
    
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
}

module.exports = connectToDb;