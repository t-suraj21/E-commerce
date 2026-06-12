const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const connString = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tks_db';
    console.log('Database Config: Attempting connection to MongoDB...');
    const conn = await mongoose.connect(connString);
    console.log(`Database connected successfully using: mongodb (Host: ${conn.connection.host})`);
  } catch (error) {
    console.error('Database connection failure:', error.message);
    throw error;
  }
};

module.exports = { connectDB };
