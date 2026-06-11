const app = require('./app');
const { connectDB, sequelize } = require('./config/db');
const { execSync } = require('child_process');

const PORT = process.env.PORT || 8001;

const startListening = () => {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`===================================================`);
    console.log(` Tarun Kirana Store Server is running on port ${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(` Server URL: http://0.0.0.0:${PORT}`);
    console.log(`===================================================`);
  });

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

const startServer = async () => {
  try {
    // 1. Establish Database Connection
    await connectDB();

    // 2. Sync Models
    await sequelize.sync();
    console.log('Database synced successfully.');

    // 3. Start Listening
    startListening();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
