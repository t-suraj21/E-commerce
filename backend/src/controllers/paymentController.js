const mongoose = require('mongoose');
const { Payment, Order, User } = require('../models');

// @desc    Initiate a payment transaction for an order
// @route   POST /api/payments/initiate
// @access  Private (Customer)
const initiatePayment = async (req, res) => {
  try {
    const { orderId, method, amount } = req.body;

    if (!orderId || !method || !amount) {
      return res.status(400).json({ success: false, message: 'Please provide orderId, method and amount' });
    }

    // Verify order belongs to the user
    const order = await Order.findOne({
      _id: orderId,
      userId: req.user.id
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found or not authorized' });
    }

    // Check if there is already a successful payment for this order
    const existingSuccess = await Payment.findOne({
      orderId,
      status: 'success'
    });
    if (existingSuccess) {
      return res.status(400).json({ success: false, message: 'This order has already been paid for' });
    }

    // Generate a unique simulated transaction ID
    const randomSuffix = Math.floor(10000000 + Math.random() * 90000000);
    const transactionId = `TKS-TXN-${method.toUpperCase()}-${randomSuffix}`;

    const payment = await Payment.create({
      orderId,
      userId: req.user.id,
      method,
      amount,
      status: 'pending',
      transactionId
    });

    res.status(201).json({
      success: true,
      message: 'Payment initiated successfully',
      payment
    });
  } catch (error) {
    console.error('Initiate payment error:', error);
    res.status(500).json({ success: false, message: 'Server error initiating payment' });
  }
};

// @desc    Verify payment transaction
// @route   POST /api/payments/verify
// @access  Private (Customer)
const verifyPayment = async (req, res) => {
  try {
    const { paymentId, status, failureReason } = req.body;

    if (!paymentId || !status) {
      return res.status(400).json({ success: false, message: 'Please provide paymentId and status' });
    }

    const payment = await Payment.findOne({
      _id: paymentId,
      userId: req.user.id
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Payment is already processed with status: ${payment.status}` });
    }

    const order = await Order.findOne({
      _id: payment.orderId,
      userId: req.user.id
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Associated order not found' });
    }

    if (status === 'success') {
      // Update payment record
      payment.status = 'success';
      payment.paidAt = new Date();
      await payment.save();

      // Update order status
      order.paymentStatus = 'paid';
      order.status = 'accepted';
      await order.save();
    } else {
      // Update payment record as failed
      payment.status = 'failed';
      payment.failureReason = failureReason || 'Simulated transaction failed';
      await payment.save();

      // Update order paymentStatus
      order.paymentStatus = 'failed';
      await order.save();
    }

    // Fetch updated payment with order
    const updatedPayment = await Payment.findById(paymentId)
      .populate('order');

    res.json({
      success: true,
      message: `Payment status verified as ${status}`,
      payment: updatedPayment
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ success: false, message: 'Server error verifying payment' });
  }
};

// @desc    Retry payment for a failed order payment
// @route   POST /api/payments/retry
// @access  Private (Customer)
const retryPayment = async (req, res) => {
  try {
    const { orderId, method } = req.body;

    if (!orderId || !method) {
      return res.status(400).json({ success: false, message: 'Please provide orderId and method' });
    }

    const order = await Order.findOne({
      _id: orderId,
      userId: req.user.id
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Order is already paid' });
    }

    // Generate new payment request
    const randomSuffix = Math.floor(10000000 + Math.random() * 90000000);
    const transactionId = `TKS-TXN-${method.toUpperCase()}-${randomSuffix}`;

    const payment = await Payment.create({
      orderId: order._id,
      userId: req.user.id,
      method,
      amount: order.totalPrice,
      status: 'pending',
      transactionId
    });

    // Also update order's paymentMethod to the newly selected one
    order.paymentMethod = method;
    await order.save();

    res.status(201).json({
      success: true,
      message: 'New payment attempt initiated',
      payment
    });
  } catch (error) {
    console.error('Retry payment error:', error);
    res.status(500).json({ success: false, message: 'Server error retrying payment' });
  }
};

// @desc    Get transaction history
// @route   GET /api/payments/history
// @access  Private (Customer sees own, Admin sees all)
const getTransactionHistory = async (req, res) => {
  try {
    let whereClause = {};

    if (req.user.role === 'customer') {
      whereClause.userId = req.user.id;
    }

    const payments = await Payment.find(whereClause)
      .populate('order', 'id totalPrice status createdAt')
      .populate('user', 'id name email phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (error) {
    console.error('Get transaction history error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving transaction history' });
  }
};

// @desc    Get payment details by order ID
// @route   GET /api/payments/order/:orderId
// @access  Private
const getPaymentByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne(
      req.user.role === 'customer' ? { _id: orderId, userId: req.user.id } : { _id: orderId }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const payments = await Payment.find({ orderId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      payments
    });
  } catch (error) {
    console.error('Get payment by order error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving payment details' });
  }
};

module.exports = {
  initiatePayment,
  verifyPayment,
  retryPayment,
  getTransactionHistory,
  getPaymentByOrder
};
