const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  discountPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'discount_price',
    validate: {
      min: 0
    }
  },
  stockQuantity: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    field: 'stock_quantity',
    validate: {
      min: 0
    }
  },
  unit: {
    type: DataTypes.ENUM('kg', 'gram', 'liter', 'piece', 'dozen', 'packet'),
    defaultValue: 'piece',
    allowNull: false
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'image_url'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  isBestSeller: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_best_seller'
  },
  isTodayDeal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_today_deal'
  },
  isNewArrival: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_new_arrival'
  },
  discountPercent: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'discount_percent',
    validate: {
      min: 0,
      max: 100
    }
  },
  images: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '[]',
    get() {
      const raw = this.getDataValue('images');
      try {
        return raw ? JSON.parse(raw) : [];
      } catch (err) {
        return [];
      }
    },
    set(val) {
      this.setDataValue('images', JSON.stringify(val || []));
    }
  }
}, {
  timestamps: true,
  underscored: true
});

module.exports = Product;
