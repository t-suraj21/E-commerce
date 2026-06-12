const { CartItem, Product, Coupon } = require('../models');

// Helper to calculate price based on weight
const calculateWeightPrice = (product, basePrice, weight) => {
  if (!weight || !product) return basePrice;
  
  const unit = (product.unit || '').toLowerCase();
  if (unit !== 'kg' && unit !== 'gram') {
    const name = (product.name || '').toLowerCase();
    const keywords = ['rice', 'flour', 'floar', 'maida', 'sugar', 'daal', 'humad', 'misri', 'badam', 'channa', 'jawain', 'mangraila', 'dal'];
    const matchesKeyword = keywords.some(keyword => name.includes(keyword));
    if (!matchesKeyword) return basePrice;
  }

  const match = weight.match(/^(\d+)\s*(gm|g|kg)$/i);
  if (!match) return basePrice;
  
  const value = parseFloat(match[1]);
  const matchUnit = match[2].toLowerCase();
  
  if (matchUnit === 'gm' || matchUnit === 'g') {
    if (unit === 'gram') {
      return basePrice * value;
    } else {
      return (basePrice / 1000) * value;
    }
  } else if (matchUnit === 'kg') {
    if (unit === 'gram') {
      return basePrice * 1000 * value;
    } else {
      return basePrice * value;
    }
  }
  return basePrice;
};


// @desc    Get user cart
// @route   GET /api/cart
// @access  Private (Customer)
const getCart = async (req, res) => {
  try {
    const cartItems = await CartItem.find({ userId: req.user.id })
      .populate({
        path: 'productId',
        select: 'id name price unit imageUrl stockQuantity isActive',
        // In virtuals setup, it maps productId to product, so populating 'productId' is correct
      });
    
    // To match Sequelize's output format where product object is inside 'product' field:
    // since we set a virtual for 'product' in CartItem.js that references 'productId',
    // populating 'productId' works, but populating 'product' directly via virtual is cleaner!
    // Let's populate 'product':
    const populatedCart = await CartItem.find({ userId: req.user.id })
      .populate('product');

    res.json({ success: true, count: populatedCart.length, cartItems: populatedCart });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching cart' });
  }
};

// @desc    Add or update item in cart
// @route   POST /api/cart
// @access  Private (Customer)
const addToCart = async (req, res) => {
  try {
    const { productId, quantity, weight } = req.body;
    const reqQty = quantity ? parseInt(quantity, 10) : 1;
    const selectedWeight = weight || '1kg';

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    // Verify product exists and has stock
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not found or inactive' });
    }

    // Check if item already in cart with same weight
    let cartItem = await CartItem.findOne({
      userId: req.user.id,
      productId,
      weight: selectedWeight
    });

    if (cartItem) {
      // Update quantity
      const newQty = cartItem.quantity + reqQty;
      if (newQty > product.stockQuantity) {
        return res.status(400).json({
          success: false,
          message: `Cannot add more items. Only ${product.stockQuantity} in stock.`
        });
      }
      cartItem.quantity = newQty;
      await cartItem.save();
    } else {
      // Create new cart item
      if (reqQty > product.stockQuantity) {
        return res.status(400).json({
          success: false,
          message: `Cannot add. Only ${product.stockQuantity} in stock.`
        });
      }
      cartItem = await CartItem.create({
        userId: req.user.id,
        productId,
        quantity: reqQty,
        weight: selectedWeight
      });
    }

    // Fetch updated cart item with product details
    const updatedItem = await CartItem.findById(cartItem.id)
      .populate('product');

    res.json({ success: true, cartItem: updatedItem });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ success: false, message: 'Server error adding to cart' });
  }
};

// @desc    Update quantity of cart item
// @route   PUT /api/cart/:productId
// @access  Private (Customer)
const updateCartQuantity = async (req, res) => {
  try {
    const { quantity, weight } = req.body;
    const productId = req.params.productId;
    const selectedWeight = weight || '1kg';

    if (quantity === undefined || quantity < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be 1 or more' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (quantity > product.stockQuantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stockQuantity} items in stock.`
      });
    }

    const cartItem = await CartItem.findOne({
      userId: req.user.id,
      productId,
      weight: selectedWeight
    });

    if (!cartItem) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    cartItem.quantity = quantity;
    await cartItem.save();

    const updatedItem = await CartItem.findById(cartItem.id)
      .populate('product');

    res.json({ success: true, cartItem: updatedItem });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ success: false, message: 'Server error updating cart quantity' });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/:productId
// @access  Private (Customer)
const removeFromCart = async (req, res) => {
  try {
    const selectedWeight = req.body?.weight || req.query?.weight || '1kg';
    const result = await CartItem.deleteOne({
      userId: req.user.id,
      productId: req.params.productId,
      weight: selectedWeight
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

    res.json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ success: false, message: 'Server error removing item' });
  }
};

// @desc    Clear entire cart
// @route   DELETE /api/cart
// @access  Private (Customer)
const clearCart = async (req, res) => {
  try {
    await CartItem.deleteMany({ userId: req.user.id });
    res.json({ success: true, message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ success: false, message: 'Server error clearing cart' });
  }
};

// @desc    Apply promo coupon to cart
// @route   POST /api/cart/coupon/apply
// @access  Private (Customer)
const applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;

    if (!couponCode) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }

    const code = couponCode.toUpperCase().trim();

    // 1. Fetch user cart to calculate subtotal
    const cartItems = await CartItem.find({ userId: req.user.id })
      .populate('product');

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Cannot apply coupon to an empty cart' });
    }

    // Calculate subtotal based on product's final (discounted) price
    let subtotal = 0;
    for (const item of cartItems) {
      const product = item.product;
      if (product) {
        const originalPrice = parseFloat(product.price);
        const weightPrice = calculateWeightPrice(product, originalPrice, item.weight);
        const discountedPrice = product.discountPrice 
          ? calculateWeightPrice(product, parseFloat(product.discountPrice), item.weight) 
          : weightPrice - (weightPrice * (product.discountPercent || 0)) / 100;
        subtotal += discountedPrice * item.quantity;
      }
    }

    let discount = 0;
    let message = '';

    // 2. Fetch coupon from database
    const coupon = await Coupon.findOne({ code });
    if (!coupon || !coupon.isActive || new Date(coupon.expirationDate) < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired coupon code' });
    }

    if (subtotal < parseFloat(coupon.minOrderAmount)) {
      return res.status(400).json({
        success: false,
        message: `Coupon ${code} is only applicable on orders above ₹${parseFloat(coupon.minOrderAmount).toFixed(0)}.`
      });
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({ success: false, message: 'Coupon limit reached' });
    }

    if (coupon.discountType === 'percentage') {
      discount = parseFloat((subtotal * parseFloat(coupon.discountValue) / 100).toFixed(2));
      if (coupon.maxDiscountAmount && discount > parseFloat(coupon.maxDiscountAmount)) {
        discount = parseFloat(coupon.maxDiscountAmount);
      }
      message = `${parseFloat(coupon.discountValue).toFixed(0)}% discount applied successfully!`;
    } else if (coupon.discountType === 'flat') {
      discount = parseFloat(coupon.discountValue);
      if (discount > subtotal) {
        discount = subtotal;
      }
      message = `Flat ₹${parseFloat(coupon.discountValue).toFixed(0)} discount applied successfully!`;
    } else if (coupon.discountType === 'free_shipping') {
      discount = 0.00;
      message = 'Free shipping coupon applied successfully!';
    }

    res.json({
      success: true,
      coupon: {
        code,
        discount,
        message,
        subtotal
      }
    });

  } catch (error) {
    console.error('Apply coupon error:', error);
    res.status(500).json({ success: false, message: 'Server error applying coupon' });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
  applyCoupon
};
