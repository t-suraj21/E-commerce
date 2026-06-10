const express = require('express');
const router = express.Router();
const { getActiveCoupons } = require('../controllers/couponController');

router.get('/active', getActiveCoupons);

module.exports = router;
