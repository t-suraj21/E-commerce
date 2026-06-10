const express = require('express');
const router = express.Router();
const { getDashboardStats, getCustomers } = require('../controllers/dashboardController');
const { protect } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');

router.get('/stats', protect, authorizeRoles('admin'), getDashboardStats);
router.get('/customers', protect, authorizeRoles('admin'), getCustomers);

module.exports = router;
