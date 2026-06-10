const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getHomeFeed
} = require('../controllers/productController');
const { protect } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');

const upload = require('../middlewares/upload');

router.get('/', getProducts);
router.get('/home', getHomeFeed);
router.get('/:id', getProductById);
router.post('/', protect, authorizeRoles('admin'), upload.array('images', 5), createProduct);
router.put('/:id', protect, authorizeRoles('admin'), upload.array('images', 5), updateProduct);
router.delete('/:id', protect, authorizeRoles('admin'), deleteProduct);

module.exports = router;
