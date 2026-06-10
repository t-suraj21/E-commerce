const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  data: {
    type: DataTypes.JSON,
    allowNull: true
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_read'
  },
  type: {
    type: DataTypes.ENUM('order_placed', 'order_accepted', 'order_packed', 'order_shipped', 'order_delivered', 'order_cancelled', 'offer', 'general'),
    defaultValue: 'general',
    allowNull: false
  }
}, {
  timestamps: true,
  underscored: true
});

module.exports = Notification;
