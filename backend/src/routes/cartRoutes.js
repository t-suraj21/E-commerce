const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
  applyCoupon
} = require('../controllers/cartController');
const { protect } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');

router.use(protect);
router.use(authorizeRoles('customer'));

router.post('/coupon/apply', applyCoupon);

router.route('/')
  .get(getCart)
  .post(addToCart)
  .delete(clearCart);

router.route('/:productId')
  .put(updateCartQuantity)
  .delete(removeFromCart);

module.exports = router;
