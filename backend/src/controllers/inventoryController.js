const { Product, Category, Order, OrderItem, User } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

// @desc    Get inventory summary metrics
// @route   GET /api/inventory/summary
// @access  Private (Admin)
const getInventorySummary = async (req, res) => {
  try {
    const totalProducts = await Product.count();
    const outOfStock = await Product.count({ where: { stockQuantity: 0 } });
    const lowStock = await Product.count({
      where: {
        stockQuantity: {
          [Op.gt]: 0,
          [Op.lt]: 10
        }
      }
    });
    const inStock = totalProducts - outOfStock - lowStock;

    // Calculate total inventory valuation: SUM(price * stockQuantity)
    const valuationResult = await Product.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.literal('price * stock_quantity')), 'totalValuation']
      ],
      raw: true
    });

    const totalValuation = parseFloat(valuationResult[0].totalValuation || 0);

    res.json({
      success: true,
      summary: {
        totalProducts,
        inStock,
        lowStock,
        outOfStock,
        totalValuation: parseFloat(totalValuation.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Get inventory summary error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching inventory summary' });
  }
};

// @desc    Get inventory items with filters and sorting
// @route   GET /api/inventory/items
// @access  Private (Admin)
const getInventoryItems = async (req, res) => {
  try {
    const { status, search, sortBy, order } = req.query;
    
    let whereClause = {};

    if (search) {
      whereClause.name = { [Op.like]: `%${search}%` };
    }

    if (status === 'out_of_stock') {
      whereClause.stockQuantity = 0;
    } else if (status === 'low_stock') {
      whereClause.stockQuantity = {
        [Op.gt]: 0,
        [Op.lt]: 10
      };
    } else if (status === 'in_stock') {
      whereClause.stockQuantity = {
        [Op.gte]: 10
      };
    }

    let sortOrder = [['name', 'ASC']];
    if (sortBy === 'stock') {
      sortOrder = [['stockQuantity', order === 'desc' ? 'DESC' : 'ASC']];
    } else if (sortBy === 'price') {
      sortOrder = [['price', order === 'desc' ? 'DESC' : 'ASC']];
    } else if (sortBy === 'name') {
      sortOrder = [['name', order === 'desc' ? 'DESC' : 'ASC']];
    }

    const items = await Product.findAll({
      where: whereClause,
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
      order: sortOrder
    });

    res.json({
      success: true,
      count: items.length,
      items
    });
  } catch (error) {
    console.error('Get inventory items error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching inventory items' });
  }
};

// @desc    Quickly update stock quantity for a product
// @route   PUT /api/inventory/product/:id/stock
// @access  Private (Admin)
const updateProductStock = async (req, res) => {
  try {
    const { stockQuantity } = req.body;
    
    if (stockQuantity === undefined || parseInt(stockQuantity, 10) < 0) {
      return res.status(400).json({ success: false, message: 'Please provide a non-negative stock quantity' });
    }

    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const oldStock = product.stockQuantity;
    await product.update({ stockQuantity: parseInt(stockQuantity, 10) });

    res.json({
      success: true,
      message: `Stock updated successfully from ${oldStock} to ${stockQuantity}`,
      product
    });
  } catch (error) {
    console.error('Update product stock error:', error);
    res.status(500).json({ success: false, message: 'Server error updating product stock' });
  }
};

// @desc    Toggle product availability (is_active)
// @route   PUT /api/inventory/product/:id/availability
// @access  Private (Admin)
const updateProductAvailability = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({ success: false, message: 'Please specify isActive status' });
    }

    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await product.update({ isActive: !!isActive });

    res.json({
      success: true,
      message: `Product availability updated successfully to ${isActive ? 'Active' : 'Inactive'}`,
      product
    });
  } catch (error) {
    console.error('Update product availability error:', error);
    res.status(500).json({ success: false, message: 'Server error updating product availability' });
  }
};

// @desc    Get detailed category inventory valuation and alert reports
// @route   GET /api/inventory/reports
// @access  Private (Admin)
const getInventoryReports = async (req, res) => {
  try {
    // 1. Out of stock products
    const outOfStockItems = await Product.findAll({
      where: { stockQuantity: 0 },
      include: [{ model: Category, as: 'category', attributes: ['name'] }],
      order: [['name', 'ASC']]
    });

    // 2. Low stock products
    const lowStockItems = await Product.findAll({
      where: {
        stockQuantity: {
          [Op.gt]: 0,
          [Op.lt]: 10
        }
      },
      include: [{ model: Category, as: 'category', attributes: ['name'] }],
      order: [['stockQuantity', 'ASC']]
    });

    // 3. Category valuation report
    // select category_id, count(*) as count, sum(stock_quantity) as totalStock, sum(price * stock_quantity) as totalValuation group by category_id
    const categoryReportRaw = await Product.findAll({
      attributes: [
        'categoryId',
        [sequelize.fn('COUNT', sequelize.col('Product.id')), 'productCount'],
        [sequelize.fn('SUM', sequelize.col('stock_quantity')), 'totalStock'],
        [sequelize.fn('SUM', sequelize.literal('price * stock_quantity')), 'categoryValuation']
      ],
      include: [{ model: Category, as: 'category', attributes: ['name'] }],
      group: ['categoryId', 'category.id'],
      raw: true
    });

    const categoryValuationReport = categoryReportRaw.map(item => ({
      categoryId: item.categoryId,
      categoryName: item['category.name'] || 'Uncategorized',
      productCount: parseInt(item.productCount || 0, 10),
      totalStock: parseInt(item.totalStock || 0, 10),
      valuation: parseFloat(parseFloat(item.categoryValuation || 0).toFixed(2))
    })).sort((a, b) => b.valuation - a.valuation);

    res.json({
      success: true,
      reports: {
        outOfStock: {
          count: outOfStockItems.length,
          items: outOfStockItems
        },
        lowStock: {
          count: lowStockItems.length,
          items: lowStockItems
        },
        categoryValuation: categoryValuationReport
      }
    });
  } catch (error) {
    console.error('Get inventory reports error:', error);
    res.status(500).json({ success: false, message: 'Server error generating inventory reports' });
  }
};

module.exports = {
  getInventorySummary,
  getInventoryItems,
  updateProductStock,
  updateProductAvailability,
  getInventoryReports
};
