const { Coupon } = require('../models');
const cacheService = require('../services/cacheService');

// @desc    Get active coupons
// @route   GET /api/coupons/active
// @access  Public
const getActiveCoupons = async (req, res) => {
  try {
    const cached = cacheService.get('coupons:active');
    if (cached) {
      return res.json({
        success: true,
        coupons: cached
      });
    }

    const coupons = await Coupon.find({
      isActive: true,
      expirationDate: { $gt: new Date() }
    }).select('id code discountType discountValue minOrderAmount maxDiscountAmount expirationDate description')
      .sort({ createdAt: -1 });

    cacheService.set('coupons:active', coupons, 300); // 5 minutes cache

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
