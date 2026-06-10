const express = require('express');
const router = express.Router();
const {
  getInventorySummary,
  getInventoryItems,
  updateProductStock,
  updateProductAvailability,
  getInventoryReports
} = require('../controllers/inventoryController');
const { protect } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');

// Restrict all inventory management endpoints to authenticated admins
router.use(protect, authorizeRoles('admin'));

router.get('/summary', getInventorySummary);
router.get('/items', getInventoryItems);
router.put('/product/:id/stock', updateProductStock);
router.put('/product/:id/availability', updateProductAvailability);
router.get('/reports', getInventoryReports);

module.exports = router;
