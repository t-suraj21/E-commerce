const { Category, Product, Coupon } = require('../models');
const cacheService = require('../services/cacheService');
const { optimizeImageUrl } = require('../utils/imageOptimizer');

// @desc    Get aggregated home data (Categories, Featured Products, Offers, Banners)
// @route   GET /api/home
// @access  Public
const getHomeData = async (req, res) => {
  try {
    // 1. Check in-memory Cache
    const cacheKey = 'home:data';
    const cachedData = cacheService.get(cacheKey);
    if (cachedData) {
      return res.json({
        success: true,
        ...cachedData
      });
    }

    // 2. Fetch categories (optimized query)
    const rawCategories = await Category.find()
      .select('id name imageUrl')
      .sort({ name: 1 });
      
    const categories = rawCategories.map(cat => ({
      id: cat.id,
      name: cat.name,
      imageUrl: optimizeImageUrl(cat.imageUrl, 200) // Small thumbnail size for speed
    }));

    // 3. Fetch Featured Products (combines Best Sellers / Today's Deals / New Arrivals, optimized query)
    const rawProducts = await Product.find({ isActive: true })
      .select('id name price discountPrice discountPercent stockQuantity unit imageUrl isBestSeller isTodayDeal isNewArrival')
      .limit(20);

    const featuredProducts = rawProducts.map(prod => ({
      id: prod.id,
      name: prod.name,
      price: prod.price,
      discountPrice: prod.discountPrice,
      discountPercent: prod.discountPercent,
      stockQuantity: prod.stockQuantity,
      unit: prod.unit,
      imageUrl: optimizeImageUrl(prod.imageUrl, 400), // Medium size
      isBestSeller: prod.isBestSeller,
      isTodayDeal: prod.isTodayDeal,
      isNewArrival: prod.isNewArrival
    }));

    // 4. Fetch Active Coupons/Offers
    const rawCoupons = await Coupon.find({
      isActive: true,
      expirationDate: { $gt: new Date() }
    }).select('id code discountType discountValue minOrderAmount maxDiscountAmount expirationDate description')
      .sort({ createdAt: -1 });

    const offers = rawCoupons.map(coupon => ({
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      description: coupon.description
    }));

    // 5. Define dynamic banners (optimized Cloudinary images)
    const banners = [
      {
        id: 1,
        title: 'Superfast Delivery',
        subtitle: 'Kirana items at your door in 10 mins!',
        image: optimizeImageUrl('https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80', 600),
        color: '#E8F5E9'
      },
      {
        id: 2,
        title: 'Monsoon Dairy Deals',
        subtitle: 'Up to 15% off on Ghee, Butter & Milk',
        image: optimizeImageUrl('https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=600&auto=format&fit=crop&q=80', 600),
        color: '#FFF3E0'
      },
      {
        id: 3,
        title: 'Fresh Fruits Discount',
        subtitle: '100% organic red apples & farm bananas',
        image: optimizeImageUrl('https://images.unsplash.com/photo-1610832958506-ee563361f158?w=600&auto=format&fit=crop&q=80', 600),
        color: '#E3F2FD'
      }
    ];

    const aggregatedResponse = {
      categories,
      featuredProducts,
      offers,
      banners
    };

    // Cache the aggregated payload for 5 minutes (300 seconds)
    cacheService.set(cacheKey, aggregatedResponse, 300);

    res.json({
      success: true,
      ...aggregatedResponse
    });
  } catch (error) {
    console.error('Aggregated home API error:', error);
    res.status(500).json({ success: false, message: 'Server error loading home feed aggregation' });
  }
};

module.exports = {
  getHomeData
};
