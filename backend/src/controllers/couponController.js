const { Coupon } = require('../models');

// @desc    Get active coupons
// @route   GET /api/coupons/active
// @access  Public
const getActiveCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({
      isActive: true,
      expirationDate: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      coupons
    });
  } catch (error) {
    console.error('Error fetching active coupons:', error);
    res.status(500).json({ success: false, message: 'Server error fetching active coupons' });
  }
};

module.exports = {
  getActiveCoupons
};
