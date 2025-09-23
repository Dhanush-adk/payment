const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    required: true
  },
  items: [{
    productId: String,
    name: String,
    quantity: Number,
    price: Number,
    total: Number,
    hsnCode: String,
    gstRate: { type: Number, default: 18 }
  }],
  pricing: {
    subtotal: Number,
    gstAmount: Number,
    totalAmount: Number,
    currency: { type: String, default: 'INR' }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'pending'
  },
  shippingAddress: {
    name: String,
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' },
    phone: String,
    landmark: String
  },
  billingAddress: {
    name: String,
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' },
    phone: String
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['upi', 'card', 'netbanking', 'wallet', 'cash_on_delivery']
  },
  gstDetails: {
    gstNumber: String,
    isGstRegistered: { type: Boolean, default: false },
    gstRate: { type: Number, default: 18 },
    cgst: Number,
    sgst: Number,
    igst: Number,
    totalGst: Number
  },
  delivery: {
    estimatedDelivery: Date,
    trackingNumber: String,
    courierPartner: String,
    deliveryInstructions: String
  },
  compliance: {
    rbiCompliant: { type: Boolean, default: true },
    dataRetention: { type: Date, default: () => new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000) }
  }
}, {
  timestamps: true
});

// Pre-save middleware to calculate pricing
orderSchema.pre('save', function(next) {
  if (this.isModified('items') && this.items.length > 0) {
    this.pricing.subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const gstRate = this.gstDetails.gstRate || 18;
    this.pricing.gstAmount = (this.pricing.subtotal * gstRate) / 100;
    this.pricing.totalAmount = this.pricing.subtotal + this.pricing.gstAmount;
    
    // Calculate GST breakdown
    const isInterState = this.billingAddress?.state !== this.shippingAddress?.state;
    
    if (isInterState) {
      this.gstDetails.igst = this.pricing.gstAmount;
      this.gstDetails.cgst = 0;
      this.gstDetails.sgst = 0;
    } else {
      this.gstDetails.igst = 0;
      this.gstDetails.cgst = this.pricing.gstAmount / 2;
      this.gstDetails.sgst = this.pricing.gstAmount / 2;
    }
    
    this.gstDetails.totalGst = this.pricing.gstAmount;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
