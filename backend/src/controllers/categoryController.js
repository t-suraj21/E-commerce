const { Category } = require('../models');
const cacheService = require('../services/cacheService');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const cached = cacheService.get('categories');
    if (cached) {
      return res.json({ success: true, count: cached.length, categories: cached });
    }

    const categories = await Category.find().sort({ name: 1 });
    cacheService.set('categories', categories, 600); // 10 minutes cache
    res.json({ success: true, count: categories.length, categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching categories' });
  }
};

// @desc    Create a category
// @route   POST /api/categories
// @access  Private (Shopkeeper/Admin)
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    let imageUrl = req.body.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60';

    if (req.file) {
      imageUrl = `/uploads/products/${req.file.filename}`;
    }

    const categoryExists = await Category.findOne({ name });
    if (categoryExists) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    const category = await Category.create({ name, description, imageUrl });
    cacheService.delete('categories');
    res.status(201).json({ success: true, category });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ success: false, message: 'Server error creating category' });
  }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private (Shopkeeper/Admin)
const updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    let imageUrl = req.body.imageUrl !== undefined ? req.body.imageUrl : category.imageUrl;
    if (req.file) {
      imageUrl = `/uploads/products/${req.file.filename}`;
    }

    category.name = name !== undefined ? name : category.name;
    category.description = description !== undefined ? description : category.description;
    category.imageUrl = imageUrl;
    await category.save();

    cacheService.delete('categories');
    res.json({ success: true, category });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ success: false, message: 'Server error updating category' });
  }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private (Shopkeeper/Admin)
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    await category.deleteOne();
    cacheService.delete('categories');
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting category' });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
