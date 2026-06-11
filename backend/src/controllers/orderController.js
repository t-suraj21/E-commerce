const { sequelize } = require('../config/db');
const { Order, OrderItem, CartItem, Product, Address, User, Payment, Coupon } = require('../models');
const { sendNotificationToUser, sendNotificationToRole } = require('../services/notificationService');
const whatsappService = require('../services/whatsappCloudService');

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
  const transaction = await sequelize.transaction();
  try {
    const { addressId, paymentMethod, couponCode } = req.body;

    if (!addressId) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Please provide a shipping address' });
    }

    // 1. Get address
    const address = await Address.findOne({
      where: { id: addressId, userId: req.user.id }
    });
    if (!address) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Shipping address not found' });
    }

    // 2. Get cart items
    const cartItems = await CartItem.findAll({
      where: { userId: req.user.id },
      include: [{ model: Product, as: 'product' }]
    });

    if (!cartItems || cartItems.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Your cart is empty' });
    }

    // 3. Verify stock, compute subtotal price
    let subtotal = 0;
    const itemsToCreate = [];

    for (const item of cartItems) {
      const product = item.product;

      if (!product || !product.isActive) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Product "${product ? product.name : 'Unknown'}" is no longer available.`
        });
      }

      if (item.quantity > product.stockQuantity) {
        await transaction.rollback();
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
        productId: product.id,
        quantity: item.quantity,
        price: discountedPrice, // Capture the purchase price (discounted)
        weight: item.weight
      });
    }

    // 4. Calculate coupon discount
    let discount = 0;
    let validatedCouponCode = null;

    if (couponCode) {
      const code = couponCode.toUpperCase().trim();
      const coupon = await Coupon.findOne({ where: { code }, transaction });
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
            await coupon.increment('usageCount', { by: 1, transaction });
          }
        }
      }
    }

    // 5. Calculate delivery charges
    let deliveryCharge = 30.00;
    if (subtotal > 200 || validatedCouponCode === 'FREESHIP') {
      deliveryCharge = 0.00;
    }

    // 6. Calculate tax (GST is removed, tax is 0.00)
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
    }, { transaction });

    // 8.1 Create Payment Record
    const randomSuffix = Math.floor(10000000 + Math.random() * 90000000);
    const transactionId = `TKS-TXN-${(paymentMethod || 'cod').toUpperCase()}-${randomSuffix}`;
    const payment = await Payment.create({
      orderId: order.id,
      userId: req.user.id,
      method: paymentMethod || 'cod',
      amount: totalPrice,
      status: 'pending',
      transactionId
    }, { transaction });

    // 9. Create Order Items and update product stock
    for (const item of itemsToCreate) {
      await OrderItem.create({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        weight: item.weight
      }, { transaction });

      // Deduct stock
      await Product.decrement('stockQuantity', {
        by: item.quantity,
        where: { id: item.productId },
        transaction
      });
    }

    // 10. Clear Cart
    await CartItem.destroy({
      where: { userId: req.user.id },
      transaction
    });

    await transaction.commit();

    // Fetch complete order with items and addresses
    const completedOrder = await Order.findByPk(order.id, {
      include: [
        { model: Address, as: 'address' },
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'imageUrl', 'unit'] }]
        },
        { model: Payment, as: 'payments' }
      ]
    });

    res.status(201).json({ success: true, order: completedOrder, initialPayment: payment });

    // Dispatch Push Notifications asynchronously
    sendNotificationToUser(
      req.user.id,
      'Order Placed! 🛍️',
      `Your order #TKS-${order.id} has been placed. Total Bill: ₹${totalPrice}.`,
      { orderId: order.id.toString(), type: 'order_placed' }
    ).catch(err => console.error('Error sending order placed notification:', err));

    sendNotificationToRole(
      'admin',
      'New Order Received! 📦',
      `Order #TKS-${order.id} has been placed by ${req.user.name}.`,
      { orderId: order.id.toString(), type: 'new_order' }
    ).catch(err => console.error('Error sending shopkeeper notification:', err));

    // Send WhatsApp Cloud API Notification
    whatsappService.sendOrderPlacedMessage(completedOrder, req.user)
      .catch(err => console.error('Error sending WhatsApp order placed message:', err));

  } catch (error) {
    await transaction.rollback();
    console.error('Create order transaction error:', error);
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

    const orders = await Order.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] },
        { model: Address, as: 'address' },
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'imageUrl', 'unit'] }]
        },
        { model: Payment, as: 'payments' }
      ],
      order: [['createdAt', 'DESC']]
    });

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
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] },
        { model: Address, as: 'address' },
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'imageUrl', 'unit'] }]
        },
        { model: Payment, as: 'payments' }
      ]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Role security check
    if (req.user.role === 'customer' && order.userId !== req.user.id) {
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
    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Role based checks
    if (req.user.role === 'customer') {
      // Customer can only cancel their own pending order
      if (order.userId !== req.user.id) {
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

      // Restore product stock on cancellation
      const orderItems = await OrderItem.findAll({ where: { orderId: order.id } });
      for (const item of orderItems) {
        await Product.increment('stockQuantity', {
          by: item.quantity,
          where: { id: item.productId }
        });
      }
      // Admin can change to any status
      if (status === 'cancelled' && order.status !== 'cancelled') {
        // Restore product stock on cancellation
        const orderItems = await OrderItem.findAll({ where: { orderId: order.id } });
        for (const item of orderItems) {
          await Product.increment('stockQuantity', {
            by: item.quantity,
            where: { id: item.productId }
          });
        }
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
    await order.update(updates);

    // If the order is marked as paid (e.g., delivered COD), update the payment record
    if (updates.paymentStatus === 'paid') {
      await Payment.update(
        { status: 'success', paidAt: new Date() },
        { where: { orderId: order.id, status: 'pending' } }
      );
    }

    // Trigger Notification on Status Change
    if (status && status !== oldStatus) {
      let notifTitle = '';
      let notifBody = '';
      
      switch (status) {
        case 'accepted':
          notifTitle = 'Order Accepted! 🤝';
          notifBody = `Your order #TKS-${order.id} has been accepted by Tarun Kirana Store and is being processed.`;
          break;
        case 'packed':
          notifTitle = 'Order Packed! 📦';
          notifBody = `Your order #TKS-${order.id} has been packed and is ready for delivery.`;
          break;
        case 'out_for_delivery':
          notifTitle = 'Order Shipped! 🚚';
          notifBody = `Your order #TKS-${order.id} is out for delivery. Our executive will reach you shortly.`;
          break;
        case 'delivered':
          notifTitle = 'Order Delivered! 🎉';
          notifBody = `Your order #TKS-${order.id} has been successfully delivered. Thank you for shopping with us!`;
          break;
        case 'cancelled':
          notifTitle = 'Order Cancelled 🛑';
          notifBody = updates.rejectionReason 
            ? `Your order #TKS-${order.id} was rejected by the store. Reason: ${updates.rejectionReason}`
            : `Your order #TKS-${order.id} has been cancelled.`;
          break;
      }

      if (notifTitle && notifBody) {
        // Notify the user
        sendNotificationToUser(order.userId, notifTitle, notifBody, {
          orderId: order.id.toString(),
          type: 'order_status_update',
          newStatus: status
        }).catch(err => console.error('Error sending order status update notification:', err));

        // Notify the admins
        sendNotificationToRole('admin', `Status Update: ${notifTitle}`, `Order #TKS-${order.id} is now ${status}.`, {
          orderId: order.id.toString(),
          type: 'order_status_update',
          newStatus: status
        }).catch(err => console.error('Error sending order status update to admin:', err));
      }
    }

    const updatedOrder = await Order.findByPk(order.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'phone'] },
        { model: Address, as: 'address' },
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'imageUrl', 'unit'] }]
        }
      ]
    });

    // Send WhatsApp Cloud API Status Update Notification
    if (status && status !== oldStatus && updatedOrder.user) {
      if (status === 'accepted') {
        whatsappService.sendOrderConfirmedMessage(updatedOrder, updatedOrder.user).catch(err => console.error(err));
      } else if (status === 'out_for_delivery') {
        whatsappService.sendShippedMessage(updatedOrder, updatedOrder.user).catch(err => console.error(err));
      } else if (status === 'delivered') {
        whatsappService.sendDeliveredMessage(updatedOrder, updatedOrder.user).catch(err => console.error(err));
      } else if (status === 'cancelled') {
        whatsappService.sendCancelledMessage(updatedOrder, updatedOrder.user, updates.rejectionReason).catch(err => console.error(err));
      }
    }

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
