const { Product, Category } = require('../models');

// @desc    Get inventory summary metrics
// @route   GET /api/inventory/summary
// @access  Private (Admin)
const getInventorySummary = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const outOfStock = await Product.countDocuments({ stockQuantity: 0 });
    const lowStock = await Product.countDocuments({
      stockQuantity: { $gt: 0, $lt: 10 }
    });
    const inStock = totalProducts - outOfStock - lowStock;

    // Calculate total inventory valuation: SUM(price * stockQuantity)
    const valuationResult = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalValuation: { $sum: { $multiply: ['$price', '$stockQuantity'] } }
        }
      }
    ]);

    const totalValuation = valuationResult.length > 0 ? parseFloat(valuationResult[0].totalValuation || 0) : 0;

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
      whereClause.name = { $regex: search, $options: 'i' };
    }

    if (status === 'out_of_stock') {
      whereClause.stockQuantity = 0;
    } else if (status === 'low_stock') {
      whereClause.stockQuantity = { $gt: 0, $lt: 10 };
    } else if (status === 'in_stock') {
      whereClause.stockQuantity = { $gte: 10 };
    }

    let sortOrder = { name: 1 };
    if (sortBy === 'stock') {
      sortOrder = { stockQuantity: order === 'desc' ? -1 : 1 };
    } else if (sortBy === 'price') {
      sortOrder = { price: order === 'desc' ? -1 : 1 };
    } else if (sortBy === 'name') {
      sortOrder = { name: order === 'desc' ? -1 : 1 };
    }

    const items = await Product.find(whereClause)
      .populate('category', 'id name')
      .sort(sortOrder);

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

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const oldStock = product.stockQuantity;
    product.stockQuantity = parseInt(stockQuantity, 10);
    await product.save();

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

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    product.isActive = !!isActive;
    await product.save();

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
    const outOfStockItems = await Product.find({ stockQuantity: 0 })
      .populate('category', 'name')
      .sort({ name: 1 });

    // 2. Low stock products
    const lowStockItems = await Product.find({
      stockQuantity: { $gt: 0, $lt: 10 }
    })
      .populate('category', 'name')
      .sort({ stockQuantity: 1 });

    // 3. Category valuation report
    const categoryReportRaw = await Product.aggregate([
      {
        $group: {
          _id: '$categoryId',
          productCount: { $sum: 1 },
          totalStock: { $sum: '$stockQuantity' },
          categoryValuation: { $sum: { $multiply: ['$price', '$stockQuantity'] } }
        }
      }
    ]);

    const populatedReport = await Category.populate(categoryReportRaw, { path: '_id', select: 'name' });

    const categoryValuationReport = populatedReport.map(item => ({
      categoryId: item._id ? item._id._id : null,
      categoryName: item._id ? item._id.name : 'Uncategorized',
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
