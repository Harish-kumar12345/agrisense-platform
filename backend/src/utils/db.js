const mongoose = require('mongoose');

async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/farmers_assistant';
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(mongoUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.warn('⚠️ MongoDB connection failed:', err.message);
    throw err;
  }
}

module.exports = { connectToDatabase };


