const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus
} = require('../controllers/orderController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.route('/')
  .post(createOrder)      // Customer only (internal role check can be added, but handled in controller)
  .get(getOrders);        // Customer gets theirs, admin gets all

router.route('/:id')
  .get(getOrderById);

router.route('/:id/status')
  .put(updateOrderStatus); // Both can access, controller implements permission checks

module.exports = router;
