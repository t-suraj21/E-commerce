const express = require('express');
const router = express.Router();
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');
const { protect } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');
const upload = require('../middlewares/upload');

router.get('/', getCategories);
router.post('/', protect, authorizeRoles('admin'), upload.single('image'), createCategory);
router.put('/:id', protect, authorizeRoles('admin'), upload.single('image'), updateCategory);
router.delete('/:id', protect, authorizeRoles('admin'), deleteCategory);

module.exports = router;
