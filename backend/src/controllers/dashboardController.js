const { Order, OrderItem, Product, User, Category } = require('../models');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');

// Helper to get formatting for dates
const getStartOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// @desc    Get dashboard metrics and analytics
// @route   GET /api/dashboard/stats
// @access  Private (Shopkeeper/Admin)
const getDashboardStats = async (req, res) => {
  try {
    // 1. Core KPIs
    // Total Sales & Total Orders (all active non-cancelled)
    const salesData = await Order.findAll({
      where: { status: { [Op.ne]: 'cancelled' } },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('total_price')), 'totalSales'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalOrders']
      ],
      raw: true
    });

    const totalSales = parseFloat(salesData[0].totalSales || 0);
    const totalOrders = parseInt(salesData[0].totalOrders || 0, 10);

    // Total Customers Count
    const customerCount = await User.count({
      where: { role: 'customer' }
    });

    // Pending Orders Count
    const pendingOrdersCount = await Order.count({
      where: { status: 'pending' }
    });

    // 2. Order status breakdown
    const statusCounts = await Order.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true
    });
    const statusMap = {
      pending: 0,
      accepted: 0,
      packed: 0,
      out_for_delivery: 0,
      delivered: 0,
      cancelled: 0
    };
    statusCounts.forEach(item => {
      statusMap[item.status] = parseInt(item.count || 0, 10);
    });

    // 3. Detailed Inventory Status
    const totalProductsCount = await Product.count();
    const outOfStockCount = await Product.count({ where: { stockQuantity: 0 } });
    const lowStockCount = await Product.count({
      where: {
        stockQuantity: {
          [Op.gt]: 0,
          [Op.lt]: 10
        }
      }
    });
    const inStockCount = totalProductsCount - outOfStockCount - lowStockCount;

    // Get list of low stock items
    const lowStockItems = await Product.findAll({
      where: { stockQuantity: { [Op.lt]: 10 } },
      attributes: ['id', 'name', 'stockQuantity', 'price', 'unit'],
      order: [['stockQuantity', 'ASC']],
      limit: 10
    });

    // 4. Sales Report Analytics
    // Average Order Value (AOV)
    const averageOrderValue = totalOrders > 0 ? parseFloat((totalSales / totalOrders).toFixed(2)) : 0;

    // 5. Payment Method Analytics
    const paymentMethodStats = await Order.findAll({
      where: { status: { [Op.ne]: 'cancelled' } },
      attributes: [
        'paymentMethod',
        [sequelize.fn('SUM', sequelize.col('total_price')), 'revenue'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['paymentMethod'],
      raw: true
    });

    // 6. Category-wise Sales Reports
    // Fetch order items to calculate category sales (handles database differences gracefully)
    const orderItems = await OrderItem.findAll({
      include: [
        {
          model: Order,
          as: 'order',
          where: { status: { [Op.ne]: 'cancelled' } },
          attributes: []
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'categoryId'],
          include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }]
        }
      ]
    });

    const categorySalesMap = {};
    orderItems.forEach(item => {
      if (item.product) {
        const categoryName = item.product.category ? item.product.category.name : 'Grocery';
        const revenue = parseFloat(item.price) * item.quantity;
        const qty = item.quantity;

        if (!categorySalesMap[categoryName]) {
          categorySalesMap[categoryName] = { revenue: 0, unitsSold: 0 };
        }
        categorySalesMap[categoryName].revenue += revenue;
        categorySalesMap[categoryName].unitsSold += qty;
      }
    });

    const categorySalesReport = Object.keys(categorySalesMap).map(catName => ({
      category: catName,
      revenue: parseFloat(categorySalesMap[catName].revenue.toFixed(2)),
      unitsSold: categorySalesMap[catName].unitsSold
    })).sort((a, b) => b.revenue - a.revenue);

    // 7. Recent orders (latest 10)
    const recentOrders = await Order.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }
      ]
    });

    // 8. Generate Charts Data (Daily, Weekly, Monthly)
    // Fetch all active orders in the last 12 months for grouping
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const chartOrders = await Order.findAll({
      where: {
        status: { [Op.ne]: 'cancelled' },
        createdAt: { [Op.gte]: oneYearAgo }
      },
      order: [['createdAt', 'ASC']]
    });

    // Daily Sales (Last 7 Days)
    const dailyData = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }); // e.g. "06 Jun"
      const key = date.toDateString(); // unique grouping key
      dailyData[key] = { label: dateString, value: 0, count: 0 };
    }

    // Weekly Sales (Last 8 Weeks)
    const weeklyData = {};
    for (let i = 7; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - (i * 7));
      const label = `Wk -${i}`;
      // Calculate start and end date boundaries for this week grouping
      const start = getStartOfDay(new Date(date.getTime() - 6 * 24 * 60 * 60 * 1000));
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      weeklyData[label] = { label, value: 0, count: 0, start, end };
    }

    // Monthly Sales (Last 6 Months)
    const monthlyData = {};
    const monthsOrder = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const label = date.toLocaleDateString('en-US', { month: 'short' }); // e.g. "Jun"
      const year = date.getFullYear();
      const key = `${date.getMonth()}-${year}`;
      monthlyData[key] = { label, value: 0, count: 0 };
      monthsOrder.push(key);
    }

    // Distribute order calculations in memory (database dialect agnostic)
    chartOrders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const orderValue = parseFloat(order.totalPrice);

      // Map to Daily
      const dailyKey = orderDate.toDateString();
      if (dailyData[dailyKey]) {
        dailyData[dailyKey].value += orderValue;
        dailyData[dailyKey].count += 1;
      }

      // Map to Weekly
      const orderTime = orderDate.getTime();
      Object.keys(weeklyData).forEach(wkLabel => {
        const wk = weeklyData[wkLabel];
        if (orderTime >= wk.start.getTime() && orderTime <= wk.end.getTime()) {
          wk.value += orderValue;
          wk.count += 1;
        }
      });

      // Map to Monthly
      const monthKey = `${orderDate.getMonth()}-${orderDate.getFullYear()}`;
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].value += orderValue;
        monthlyData[monthKey].count += 1;
      }
    });

    const dailyChart = Object.values(dailyData);
    
    const weeklyChart = Object.keys(weeklyData).map(label => ({
      label,
      value: parseFloat(weeklyData[label].value.toFixed(2)),
      count: weeklyData[label].count
    }));

    const monthlyChart = monthsOrder.map(key => ({
      label: monthlyData[key].label,
      value: parseFloat(monthlyData[key].value.toFixed(2)),
      count: monthlyData[key].count
    }));

    res.json({
      success: true,
      stats: {
        kpis: {
          totalSales: parseFloat(totalSales.toFixed(2)),
          totalOrders,
          totalCustomers: customerCount,
          pendingOrders: pendingOrdersCount,
          statusCounts: statusMap,
          averageOrderValue,
          lowStockCount,
          outOfStockCount
        },
        inventory: {
          totalProducts: totalProductsCount,
          inStock: inStockCount,
          outOfStock: outOfStockCount,
          lowStock: lowStockCount
        },
        lowStockItems: lowStockItems,
        paymentStats: paymentMethodStats.map(item => ({
          paymentMethod: item.paymentMethod || 'Unknown',
          revenue: parseFloat(parseFloat(item.revenue || 0).toFixed(2)),
          count: parseInt(item.count || 0, 10)
        })),
        categorySales: categorySalesReport,
        recentOrders,
        charts: {
          daily: dailyChart,
          weekly: weeklyChart,
          monthly: monthlyChart
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving dashboard metrics' });
  }
};

// @desc    Get list of customers
// @route   GET /api/dashboard/customers
// @access  Private (Admin)
const getCustomers = async (req, res) => {
  try {
    const customers = await User.findAll({
      where: { role: 'customer' },
      attributes: ['id', 'name', 'email', 'phone', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      count: customers.length,
      customers
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving customers' });
  }
};

module.exports = {
  getDashboardStats,
  getCustomers
};
