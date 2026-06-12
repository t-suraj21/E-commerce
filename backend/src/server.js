const app = require('./app');
const { connectDB } = require('./config/db');
const { execSync } = require('child_process');

const PORT = process.env.PORT || 8001;

let serverInstance = null;

const startListening = () => {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`===================================================`);
    console.log(` Tarun Kirana Store Server is running on port ${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(` Server URL: http://0.0.0.0:${PORT}`);
    console.log(`===================================================`);
  });
  
  serverInstance = server;

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${PORT} is in use. Auto-killing the process occupying it...`);
      try {
        if (process.platform === 'win32') {
          const output = execSync(`netstat -ano | findstr :${PORT} | findstr LISTENING`).toString();
          const pid = output.trim().split(/\s+/).pop();
          if (pid) {
            execSync(`taskkill /F /PID ${pid}`);
            console.log(`✅ Killed PID ${pid} on Windows.`);
          }
        } else {
          execSync(`kill -9 $(lsof -t -i :${PORT})`);
          console.log(`✅ Killed process using port ${PORT} on Unix.`);
        }
        console.log(`🔄 Retrying port binding in 1 second...`);
        setTimeout(startListening, 1000);
      } catch (killError) {
        console.error(`❌ Failed to free port ${PORT}:`, killError.message);
        process.exit(1);
      }
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
};

const seedAdmin = async () => {
  try {
    const { User } = require('./models');
    const adminEmail = 'tarunkumar@gmail.com';
    const adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      console.log('🔄 Seeding default Admin user...');
      await User.create({
        name: 'Admin Tarun',
        email: 'tarunkumar@gmail.com',
        password: '@211227tks',
        role: 'admin',
        phone: '9999999999'
      });
      console.log('✅ Default Admin user seeded successfully.');
    } else {
      console.log('ℹ️ Admin user already exists.');
    }
  } catch (err) {
    console.error('❌ Error seeding Admin user:', err.message);
  }
};

const startServer = async () => {
  try {
    // 1. Establish Database Connection
    await connectDB();

    // 1.1 Seed Admin User
    await seedAdmin();

    // 2. Start Listening
    startListening();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown listeners
const gracefulShutdown = (signal) => {
  console.log(`\n🔄 ${signal} received. Starting graceful shutdown...`);
  
  if (serverInstance) {
    serverInstance.close(async () => {
      console.log('✅ HTTP server closed.');
      try {
        const mongoose = require('mongoose');
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed.');
        process.exit(0);
      } catch (err) {
        console.error('❌ Error closing MongoDB connection:', err.message);
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
