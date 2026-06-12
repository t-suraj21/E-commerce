const { Product, Category, OrderItem, CartItem } = require('../models');
const cacheService = require('../services/cacheService');
const { sendBroadcastNotification } = require('../services/notificationService');

// @desc    Get all products (with category filter and search query)
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const { categoryId, search, limit, offset } = req.query;
    
    // Check Cache
    const cacheKey = `products:cat=${categoryId || ''}:search=${search || ''}:lim=${limit || ''}:off=${offset || ''}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        totalCount: cached.totalCount,
        count: cached.products.length,
        products: cached.products
      });
    }

    const whereClause = { isActive: true };

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    if (search) {
      whereClause.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const limitVal = limit ? parseInt(limit, 10) : 100;
    const offsetVal = offset ? parseInt(offset, 10) : 0;

    const count = await Product.countDocuments(whereClause);
    const products = await Product.find(whereClause)
      .populate('category', 'id name')
      .sort({ name: 1 })
      .skip(offsetVal)
      .limit(limitVal);

    // Save to Cache (5 mins TTL)
    cacheService.set(cacheKey, { totalCount: count, products }, 300);

    res.json({
      success: true,
      totalCount: count,
      count: products.length,
      products
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching products' });
  }
};

// @desc    Get product details by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const cacheKey = `product:${req.params.id}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json({ success: true, product: cached });
    }

    const product = await Product.findById(req.params.id)
      .populate('category', 'id name');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    cacheService.set(cacheKey, product, 600); // 10 minutes cache

    res.json({ success: true, product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching product details' });
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private (Admin)
const createProduct = async (req, res) => {
  try {
    let { categoryId, name, description, price, discountPrice, stockQuantity, unit, isActive } = req.body;
    let imageUrl = req.body.imageUrl || '';
    let images = [];

    if (req.body.images) {
      try {
        images = typeof req.body.images === 'string' ? JSON.parse(req.body.images) : req.body.images;
      } catch(e) {}
    }

    if (req.files && req.files.length > 0) {
      const paths = req.files.map(f => `/uploads/products/${f.filename}`);
      if (!imageUrl || !imageUrl.startsWith('/uploads')) {
        imageUrl = paths[0];
      }
      images = [...images, ...paths];
    }

    // Verify category exists
    if (categoryId) {
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(400).json({ success: false, message: 'Invalid category ID' });
      }
    }

    const isActiveBool = isActive === 'true' || isActive === true || isActive === undefined;

    const product = await Product.create({
      categoryId: categoryId || null,
      name,
      description,
      price: parseFloat(price),
      discountPrice: discountPrice ? parseFloat(discountPrice) : null,
      stockQuantity: parseInt(stockQuantity, 10),
      unit,
      imageUrl,
      images,
      isActive: isActiveBool
    });

    // Invalidate Cache
    cacheService.clearPattern('products:');

    res.status(201).json({ success: true, product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: 'Server error creating product' });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private (Admin)
const updateProduct = async (req, res) => {
  try {
    let { categoryId, name, description, price, discountPrice, stockQuantity, unit, isActive, discountPercent, isTodayDeal, isBestSeller, isNewArrival } = req.body;
    let imageUrl = req.body.imageUrl;
    let images = [];
    
    if (req.body.images) {
      try {
        images = typeof req.body.images === 'string' ? JSON.parse(req.body.images) : req.body.images;
      } catch(e) {}
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (req.files && req.files.length > 0) {
      const paths = req.files.map(f => `/uploads/products/${f.filename}`);
      if (!imageUrl || !imageUrl.startsWith('/uploads')) {
        imageUrl = paths[0];
      }
      images = [...images, ...paths];
    } else {
      // Keep existing images if no new ones are provided
      if (!req.body.images) {
        images = product.images;
      }
      if (!imageUrl) {
        imageUrl = product.imageUrl;
      }
    }

    if (categoryId) {
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(400).json({ success: false, message: 'Invalid category ID' });
      }
    }

    const oldDiscount = product.discountPercent || 0;
    const newDiscount = discountPercent !== undefined ? parseInt(discountPercent, 10) : oldDiscount;

    product.categoryId = categoryId !== undefined ? (categoryId || null) : product.categoryId;
    product.name = name !== undefined ? name : product.name;
    product.description = description !== undefined ? description : product.description;
    product.price = price !== undefined ? parseFloat(price) : product.price;
    product.discountPrice = discountPrice !== undefined ? (discountPrice ? parseFloat(discountPrice) : null) : product.discountPrice;
    product.stockQuantity = stockQuantity !== undefined ? parseInt(stockQuantity, 10) : product.stockQuantity;
    product.unit = unit !== undefined ? unit : product.unit;
    product.imageUrl = imageUrl;
    product.images = images;
    product.isActive = isActive !== undefined ? (isActive === 'true' || isActive === true) : product.isActive;
    product.discountPercent = newDiscount;
    product.isTodayDeal = isTodayDeal !== undefined ? (isTodayDeal === 'true' || isTodayDeal === true) : product.isTodayDeal;
    product.isBestSeller = isBestSeller !== undefined ? (isBestSeller === 'true' || isBestSeller === true) : product.isBestSeller;
    product.isNewArrival = isNewArrival !== undefined ? (isNewArrival === 'true' || isNewArrival === true) : product.isNewArrival;

    await product.save();

    // Broadcast offer to all users if a discount is added or increased
    if (newDiscount > oldDiscount && newDiscount > 0) {
      sendBroadcastNotification(
        'Special Discount Offer! 🎁',
        `Get ${newDiscount}% OFF on "${name || product.name}" today at Tarun Kirana Store!`,
        { productId: product.id.toString(), type: 'new_offer' }
      ).catch(err => console.error('Error sending offer broadcast notification:', err));
    }

    const updatedProduct = await Product.findById(req.params.id)
      .populate('category', 'id name');

    // Invalidate Cache
    cacheService.clearPattern('products:');
    cacheService.delete(`product:${req.params.id}`);

    res.json({ success: true, product: updatedProduct });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: 'Server error updating product' });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private (Admin)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Handle references manually
    if (OrderItem) {
      await OrderItem.updateMany({ productId: product._id }, { $set: { productId: null } });
    }
    if (CartItem) {
      await CartItem.deleteMany({ productId: product._id });
    }

    await product.deleteOne();
    
    // Invalidate Cache
    cacheService.clearPattern('products:');
    cacheService.delete(`product:${req.params.id}`);

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting product' });
  }
};

// @desc    Get aggregated home page feed sections (bestsellers, deals, arrivals, recommended)
// @route   GET /api/products/home
// @access  Public
const getHomeFeed = async (req, res) => {
  try {
    // Check Cache
    const cached = cacheService.get('products:home');
    if (cached) {
      return res.json({ success: true, ...cached });
    }

    // Fetch categories
    const categories = await Category.find().sort({ name: 1 });

    // Fetch Today's Deals
    const todayDeals = await Product.find({ isTodayDeal: true, isActive: true })
      .populate('category', 'id name')
      .sort({ name: 1 })
      .limit(10);

    // Fetch Best Sellers
    const bestSellers = await Product.find({ isBestSeller: true, isActive: true })
      .populate('category', 'id name')
      .sort({ name: 1 })
      .limit(10);

    // Fetch New Arrivals
    const newArrivals = await Product.find({ isNewArrival: true, isActive: true })
      .populate('category', 'id name')
      .sort({ createdAt: -1 })
      .limit(10);

    // Fetch Recommended
    const recommended = await Product.aggregate([
      { $match: { isActive: true } },
      { $sample: { size: 10 } }
    ]);
    
    const populatedRecommended = await Product.populate(recommended, { path: 'category', select: 'id name' });
    
    // Format populated recommended docs to include virtual id to preserve backward compatibility
    const formattedRecommended = populatedRecommended.map(doc => {
      doc.id = doc._id.toString();
      // Ensure populated category has 'id' field as well
      if (doc.category && doc.category._id) {
        doc.category.id = doc.category._id.toString();
      }
      return doc;
    });

    const feedData = {
      feed: {
        categories,
        todayDeals,
        bestSellers,
        newArrivals,
        recommended: formattedRecommended
      }
    };
    cacheService.set('products:home', feedData, 600); // 10 minutes cache

    res.json({
      success: true,
      ...feedData
    });
  } catch (error) {
    console.error('Home feed error:', error);
    res.status(500).json({ success: false, message: 'Server error loading home feed' });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getHomeFeed
};
