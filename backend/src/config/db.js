const mongoose = require('mongoose');
const metricsService = require('../services/metricsService');
require('dotenv').config();

// Mongoose global query timing plugin to track performance
const queryTimerPlugin = (schema) => {
  const preHook = function(next) {
    this._startTime = Date.now();
    next();
  };

  const postHook = function(res, next) {
    if (this._startTime) {
      const duration = Date.now() - this._startTime;
      metricsService.recordQuery(duration);
      if (duration > 100) {
        const modelName = this.model?.modelName || 'Model';
        const op = this.op || 'query';
        console.warn(`[⚠️ SLOW DB QUERY] ${modelName}.${op} took ${duration}ms`);
      }
    }
    if (typeof next === 'function') next();
  };

  schema.pre(['find', 'findOne', 'countDocuments', 'findOneAndUpdate', 'findOneAndDelete'], preHook);
  schema.post(['find', 'findOne', 'countDocuments', 'findOneAndUpdate', 'findOneAndDelete'], postHook);
};

mongoose.plugin(queryTimerPlugin);

const connectDB = async () => {
  try {
    const connString = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tks_db';
    console.log('Database Config: Attempting connection to MongoDB...');
    
    // Configured connection pooling (MongoDB equivalent for connectionLimit)
    const conn = await mongoose.connect(connString, {
      maxPoolSize: 10,       // Max active connections in the pool
      minPoolSize: 2,        // Minimum connections maintained in pool
      socketTimeoutMS: 45000,// Close socket if inactive for 45s
      connectTimeoutMS: 30000,// Initial connection timeout (30s)
      serverSelectionTimeoutMS: 5000 // Error out if server isn't found within 5s
    });
    
    console.log(`Database connected successfully: mongodb (Host: ${conn.connection.host}, Pool: max 10)`);
  } catch (error) {
    console.error('Database connection failure:', error.message);
    throw error;
  }
};

module.exports = { connectDB };
