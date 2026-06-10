const User = require('./User');
const Address = require('./Address');
const Category = require('./Category');
const Product = require('./Product');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const CartItem = require('./CartItem');
const Payment = require('./Payment');
const Coupon = require('./Coupon');
const Notification = require('./Notification');

// User & Address: 1 to N
User.hasMany(Address, { foreignKey: 'userId', as: 'addresses', onDelete: 'CASCADE' });
Address.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Category & Product: 1 to N
Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products', onDelete: 'SET NULL' });
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

// User & CartItem: 1 to N
User.hasMany(CartItem, { foreignKey: 'userId', as: 'cartItems', onDelete: 'CASCADE' });
CartItem.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Product & CartItem: 1 to N
Product.hasMany(CartItem, { foreignKey: 'productId', as: 'cartItems', onDelete: 'CASCADE' });
CartItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// User & Order: 1 to N
User.hasMany(Order, { foreignKey: 'userId', as: 'orders', onDelete: 'RESTRICT' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Address & Order: 1 to N
Address.hasMany(Order, { foreignKey: 'addressId', as: 'orders', onDelete: 'RESTRICT' });
Order.belongsTo(Address, { foreignKey: 'addressId', as: 'address' });

// Order & OrderItem: 1 to N
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

// Product & OrderItem: 1 to N
Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems', onDelete: 'RESTRICT' });
OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// User & Notification: 1 to N
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User & Payment: 1 to N
User.hasMany(Payment, { foreignKey: 'userId', as: 'payments', onDelete: 'CASCADE' });
Payment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Order & Payment: 1 to N
Order.hasMany(Payment, { foreignKey: 'orderId', as: 'payments', onDelete: 'CASCADE' });
Payment.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

module.exports = {
  User,
  Address,
  Category,
  Product,
  Order,
  OrderItem,
  CartItem,
  Payment,
  Coupon,
  Notification
};
