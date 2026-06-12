const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  addressId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address',
    required: true
  },
  totalPrice: {
    type: Number,
    required: true
  },
  subtotal: {
    type: Number,
    required: true,
    default: 0.00
  },
  discount: {
    type: Number,
    required: true,
    default: 0.00
  },
  couponCode: {
    type: String,
    default: null
  },
  tax: {
    type: Number,
    required: true,
    default: 0.00
  },
  deliveryCharge: {
    type: Number,
    required: true,
    default: 0.00
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'packed', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'pending',
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'upi', 'razorpay'],
    default: 'cod',
    required: true
  },
  rejectionReason: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

orderSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

orderSchema.virtual('address', {
  ref: 'Address',
  localField: 'addressId',
  foreignField: '_id',
  justOne: true
});

orderSchema.virtual('items', {
  ref: 'OrderItem',
  localField: '_id',
  foreignField: 'orderId'
});

orderSchema.virtual('payments', {
  ref: 'Payment',
  localField: '_id',
  foreignField: 'orderId'
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
