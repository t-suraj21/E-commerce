const mongoose = require('mongoose');
const { Order, OrderItem, CartItem, Product, Address, User, Payment, Coupon } = require('../models');
const { sendNotificationToUser, sendNotificationToRole } = require('../services/notificationService');

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

// @desc    Create an order (Checkout)
// @route   POST /api/orders
// @access  Private (Customer)
const createOrder = async (req, res) => {
  try {
    const { addressId, paymentMethod, couponCode } = req.body;

    if (!addressId) {
      return res.status(400).json({ success: false, message: 'Please provide a shipping address' });
    }

    // 1. Get address
    const address = await Address.findOne({ _id: addressId, userId: req.user.id });
    if (!address) {
      return res.status(404).json({ success: false, message: 'Shipping address not found' });
    }

    // 2. Get cart items
    const cartItems = await CartItem.find({ userId: req.user.id }).populate('product');

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Your cart is empty' });
    }

    // 3. Verify stock, compute subtotal price
    let subtotal = 0;
    const itemsToCreate = [];

    for (const item of cartItems) {
      const product = item.product;

      if (!product || !product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product "${product ? product.name : 'Unknown'}" is no longer available.`
        });
      }

      if (item.quantity > product.stockQuantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.stockQuantity}`
        });
      }

      const originalPrice = parseFloat(product.price);
      const weightPrice = calculateWeightPrice(product, originalPrice, item.weight);
      const discountedPrice = product.discountPrice 
        ? calculateWeightPrice(product, parseFloat(product.discountPrice), item.weight)
        : weightPrice - (weightPrice * (product.discountPercent || 0)) / 100;
      const itemTotal = discountedPrice * item.quantity;
      subtotal += itemTotal;
 
      itemsToCreate.push({
        productId: product._id,
        quantity: item.quantity,
        price: discountedPrice,
        weight: item.weight
      });
    }

    // 4. Calculate coupon discount
    let discount = 0;
    let validatedCouponCode = null;

    if (couponCode) {
      const code = couponCode.toUpperCase().trim();
      const coupon = await Coupon.findOne({ code });
      if (coupon && coupon.isActive && new Date(coupon.expirationDate) > new Date()) {
        if (subtotal >= parseFloat(coupon.minOrderAmount)) {
          if (!coupon.usageLimit || coupon.usageCount < coupon.usageLimit) {
            validatedCouponCode = coupon.code;
            if (coupon.discountType === 'percentage') {
              discount = parseFloat((subtotal * parseFloat(coupon.discountValue) / 100).toFixed(2));
              if (coupon.maxDiscountAmount && discount > parseFloat(coupon.maxDiscountAmount)) {
                discount = parseFloat(coupon.maxDiscountAmount);
              }
            } else if (coupon.discountType === 'flat') {
              discount = parseFloat(coupon.discountValue);
              if (discount > subtotal) discount = subtotal;
            } else if (coupon.discountType === 'free_shipping') {
              discount = 0.00;
            }
            
            // Increment coupon usage count
            coupon.usageCount += 1;
            await coupon.save();
          }
        }
      }
    }

    // 5. Calculate delivery charges
    let deliveryCharge = 30.00;
    if (subtotal > 200 || validatedCouponCode === 'FREESHIP') {
      deliveryCharge = 0.00;
    }

    // 6. Calculate tax
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = 0.00;

    // 7. Calculate grand total
    const totalPrice = parseFloat((taxableAmount + tax + deliveryCharge).toFixed(2));

    // 8. Create Order
    const order = await Order.create({
      userId: req.user.id,
      addressId,
      subtotal,
      discount,
      couponCode: validatedCouponCode,
      tax,
      deliveryCharge,
      totalPrice,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: paymentMethod || 'cod'
    });

    // 8.1 Create Payment Record
    const randomSuffix = Math.floor(10000000 + Math.random() * 90000000);
    const transactionId = `TKS-TXN-${(paymentMethod || 'cod').toUpperCase()}-${randomSuffix}`;
    const payment = await Payment.create({
      orderId: order._id,
      userId: req.user.id,
      method: paymentMethod || 'cod',
      amount: totalPrice,
      status: 'pending',
      transactionId
    });

    // 9. Create Order Items and update product stock
    for (const item of itemsToCreate) {
      await OrderItem.create({
        orderId: order._id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        weight: item.weight
      });

      // Deduct stock
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { stockQuantity: -item.quantity } }
      );
    }

    // 10. Clear Cart
    await CartItem.deleteMany({ userId: req.user.id });

    // Fetch complete order with items and addresses
    const completedOrder = await Order.findById(order._id)
      .populate('address')
      .populate({
        path: 'items',
        populate: { path: 'product', select: 'id name imageUrl unit' }
      })
      .populate('payments');

    res.status(201).json({ success: true, order: completedOrder, initialPayment: payment });

    // Dispatch Push Notifications asynchronously
    sendNotificationToUser(
      req.user.id,
      'Order Placed! 🛍️',
      `Your order #TKS-${order._id} has been placed. Total Bill: ₹${totalPrice}.`,
      { orderId: order._id.toString(), type: 'order_placed' }
    ).catch(err => console.error('Error sending order placed notification:', err));

    sendNotificationToRole(
      'admin',
      'New Order Received! 📦',
      `Order #TKS-${order._id} has been placed by ${req.user.name}.`,
      { orderId: order._id.toString(), type: 'new_order' }
    ).catch(err => console.error('Error sending shopkeeper notification:', err));

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Server error processing order checkout' });
  }
};

// @desc    Get user orders (Customer: their own, Shopkeeper/Admin: all)
// @route   GET /api/orders
// @access  Private
const getOrders = async (req, res) => {
  try {
    let whereClause = {};

    // Customers only see their own orders
    if (req.user.role === 'customer') {
      whereClause.userId = req.user.id;
    }

    const orders = await Order.find(whereClause)
      .populate({ path: 'user', select: 'id name email phone' })
      .populate('address')
      .populate({
        path: 'items',
        populate: { path: 'product', select: 'id name imageUrl unit' }
      })
      .populate('payments')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching orders' });
  }
};

// @desc    Get single order details
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate({ path: 'user', select: 'id name email phone' })
      .populate('address')
      .populate({
        path: 'items',
        populate: { path: 'product', select: 'id name imageUrl unit' }
      })
      .populate('payments');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Role security check
    if (req.user.role === 'customer' && order.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching order details' });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Admin or Customer cancellation)
const updateOrderStatus = async (req, res) => {
  try {
    const { status, paymentStatus, rejectionReason } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Role based checks
    if (req.user.role === 'customer') {
      // Customer can only cancel their own pending order
      if (order.userId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      if (status !== 'cancelled') {
        return res.status(400).json({ success: false, message: 'Customers can only cancel orders' });
      }

      if (order.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Order cannot be cancelled because it is already ' + order.status
        });
      }
    }

    // Perform updates
    const updates = {};
    if (status) updates.status = status;
    if (rejectionReason && status === 'cancelled') updates.rejectionReason = rejectionReason;
    if (paymentStatus && req.user.role === 'admin') {
      updates.paymentStatus = paymentStatus;
    }

    // If marked delivered, automatically mark paid
    if (status === 'delivered') {
      updates.paymentStatus = 'paid';
    }

    const oldStatus = order.status;

    // Restore product stock globally on cancellation (customer cancellation or admin rejection)
    if (status === 'cancelled' && oldStatus !== 'cancelled') {
      const orderItems = await OrderItem.find({ orderId: order._id });
      for (const item of orderItems) {
        if (item.productId) {
          await Product.updateOne(
            { _id: item.productId },
            { $inc: { stockQuantity: item.quantity } }
          );
        }
      }
    }

    order.status = updates.status !== undefined ? updates.status : order.status;
    order.rejectionReason = updates.rejectionReason !== undefined ? updates.rejectionReason : order.rejectionReason;
    order.paymentStatus = updates.paymentStatus !== undefined ? updates.paymentStatus : order.paymentStatus;
    await order.save();

    // If the order is marked as paid (e.g., delivered COD), update the payment record
    if (order.paymentStatus === 'paid') {
      await Payment.updateMany(
        { orderId: order._id, status: 'pending' },
        { $set: { status: 'success', paidAt: new Date() } }
      );
    }

    // Trigger Notification on Status Change
    if (status && status !== oldStatus) {
      let notifTitle = '';
      let notifBody = '';
      
      switch (status) {
        case 'accepted':
          notifTitle = 'Order Accepted! 🤝';
          notifBody = `Your order #TKS-${order._id} has been accepted by Tarun Kirana Store and is being processed.`;
          break;
        case 'packed':
          notifTitle = 'Order Packed! 📦';
          notifBody = `Your order #TKS-${order._id} has been packed and is ready for delivery.`;
          break;
        case 'out_for_delivery':
          notifTitle = 'Order Shipped! 🚚';
          notifBody = `Your order #TKS-${order._id} is out for delivery. Our executive will reach you shortly.`;
          break;
        case 'delivered':
          notifTitle = 'Order Delivered! 🎉';
          notifBody = `Your order #TKS-${order._id} has been successfully delivered. Thank you for shopping with us!`;
          break;
        case 'cancelled':
          notifTitle = 'Order Cancelled 🛑';
          notifBody = updates.rejectionReason 
            ? `Your order #TKS-${order._id} was rejected by the store. Reason: ${updates.rejectionReason}`
            : `Your order #TKS-${order._id} has been cancelled.`;
          break;
      }

      if (notifTitle && notifBody) {
        // Notify the user
        sendNotificationToUser(order.userId, notifTitle, notifBody, {
          orderId: order._id.toString(),
          type: 'order_status_update',
          newStatus: status
        }).catch(err => console.error('Error sending order status update notification:', err));

        // Notify the admins
        sendNotificationToRole('admin', `Status Update: ${notifTitle}`, `Order #TKS-${order._id} is now ${status}.`, {
          orderId: order._id.toString(),
          type: 'order_status_update',
          newStatus: status
        }).catch(err => console.error('Error sending order status update to admin:', err));
      }
    }

    const updatedOrder = await Order.findById(order._id)
      .populate({ path: 'user', select: 'id name phone' })
      .populate('address')
      .populate({
        path: 'items',
        populate: { path: 'product', select: 'id name imageUrl unit' }
      });

    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Server error updating order status' });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus
};
