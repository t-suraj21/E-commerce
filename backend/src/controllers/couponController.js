const { Coupon } = require('../models');
const { Op } = require('sequelize');

// @desc    Get active coupons
// @route   GET /api/coupons/active
// @access  Public
const getActiveCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.findAll({
      where: {
        isActive: true,
        expirationDate: {
          [Op.gt]: new Date()
        }
      },
      order: [['createdAt', 'DESC']]
    });

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
