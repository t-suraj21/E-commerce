const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'total_price'
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'subtotal'
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'discount'
  },
  couponCode: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'coupon_code'
  },
  tax: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'tax'
  },
  deliveryCharge: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'delivery_charge'
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'packed', 'out_for_delivery', 'delivered', 'cancelled'),
    defaultValue: 'pending',
    allowNull: false
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'failed'),
    defaultValue: 'pending',
    allowNull: false,
    field: 'payment_status'
  },
  paymentMethod: {
    type: DataTypes.ENUM('cod', 'upi', 'razorpay'),
    defaultValue: 'cod',
    allowNull: false,
    field: 'payment_method'
  },
  rejectionReason: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'rejection_reason'
  }
}, {
  timestamps: true,
  underscored: true
});

module.exports = Order;
