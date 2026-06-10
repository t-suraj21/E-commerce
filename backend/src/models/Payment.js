const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  method: {
    type: DataTypes.ENUM('cod', 'upi', 'razorpay'),
    allowNull: false,
    defaultValue: 'cod'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'success', 'failed'),
    allowNull: false,
    defaultValue: 'pending'
  },
  transactionId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'transaction_id'
  },
  failureReason: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'failure_reason'
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'paid_at'
  }
}, {
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['order_id']
    },
    {
      fields: ['user_id']
    }
  ]
});

module.exports = Payment;
