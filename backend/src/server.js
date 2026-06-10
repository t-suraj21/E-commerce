const app = require('./app');
const { connectDB, sequelize } = require('./config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Establish Database Connection
    await connectDB();

    // 2. Sync Models
    await sequelize.sync();
    console.log('Database synced successfully.');

    // 3. Start Server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`===================================================`);
      console.log(` Tarun Kirana Store Server is running on port ${PORT}`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(` Server URL: http://0.0.0.0:${PORT}`);
      console.log(`===================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
