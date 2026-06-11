const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CartItem = sequelize.define('CartItem', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  weight: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '1kg'
  }
}, {
  timestamps: true,
  underscored: true
});

module.exports = CartItem;
