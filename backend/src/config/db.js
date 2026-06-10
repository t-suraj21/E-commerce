const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

let sequelize;

if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME) {
  console.log('Database Config: Attempting connection to MySQL...');
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST,
      dialect: 'mysql',
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
} else {
  console.log('Database Config: MySQL credentials missing. Falling back to local SQLite...');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../tks.sqlite'),
    logging: false
  });
}

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log(`Database connected successfully using: ${sequelize.getDialect()}`);
  } catch (error) {
    console.error('Database connection failure.');
    throw error;
  }
};

module.exports = { sequelize, connectDB };
