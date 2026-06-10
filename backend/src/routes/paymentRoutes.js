const express = require('express');
const router = express.Router();
const {
  initiatePayment,
  verifyPayment,
  retryPayment,
  getTransactionHistory,
  getPaymentByOrder
} = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/initiate', initiatePayment);
router.post('/verify', verifyPayment);
router.post('/retry', retryPayment);
router.get('/history', getTransactionHistory);
router.get('/order/:orderId', getPaymentByOrder);

module.exports = router;
