const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR',
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['upi', 'card', 'netbanking', 'wallet', 'cash_on_delivery'],
    required: true
  },
  paymentProvider: {
    type: String,
    enum: ['razorpay', 'payu', 'phonepe', 'cod'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentDetails: {
    // UPI Payment Details
    upiId: String,
    upiApp: String,
    upiTransactionId: String,
    
    // Card Payment Details
    cardLast4: String,
    cardBrand: String,
    cardType: String, // credit/debit
    
    // Razorpay Details
    razorpayPaymentId: String,
    razorpayOrderId: String,
    razorpaySignature: String,
    
    // PayU Details
    payuPaymentId: String,
    payuTransactionId: String,
    
    // PhonePe Details
    phonepeTransactionId: String,
    phonepeMerchantTransactionId: String,
    
    // Cash on Delivery
    deliveryAddress: {
      name: String,
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' },
      phone: String,
      landmark: String
    }
  },
  gstDetails: {
    gstNumber: String,
    gstRate: { type: Number, default: 18 },
    cgst: Number,
    sgst: Number,
    igst: Number,
    totalGst: Number,
    taxableAmount: Number
  },
  metadata: {
    customerEmail: String,
    customerPhone: String,
    customerName: String,
    description: String,
    items: [{
      name: String,
      quantity: Number,
      price: Number,
      gstRate: Number,
      hsnCode: String
    }],
    billingAddress: {
      name: String,
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' }
    }
  },
  refundDetails: {
    refundId: String,
    refundAmount: Number,
    refundReason: String,
    refundedAt: Date,
    refundStatus: {
      type: String,
      enum: ['pending', 'processed', 'failed']
    }
  },
  compliance: {
    rbiCompliant: { type: Boolean, default: true },
    pciCompliant: { type: Boolean, default: true },
    dataRetention: { type: Date, default: () => new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000) } // 7 years
  }
}, {
  timestamps: true
});

// Indexes for better performance
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ userId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ 'paymentDetails.upiTransactionId': 1 });
paymentSchema.index({ 'paymentDetails.razorpayPaymentId': 1 });

// Pre-save middleware to calculate GST
paymentSchema.pre('save', function(next) {
  if (this.isModified('amount') && this.amount > 0) {
    const gstRate = this.gstDetails.gstRate || 18;
    this.gstDetails.taxableAmount = this.amount / (1 + gstRate / 100);
    this.gstDetails.totalGst = this.amount - this.gstDetails.taxableAmount;
    
    // For inter-state transactions, use IGST; for intra-state, use CGST+SGST
    const isInterState = this.metadata.billingAddress?.state !== this.paymentDetails.deliveryAddress?.state;
    
    if (isInterState) {
      this.gstDetails.igst = this.gstDetails.totalGst;
      this.gstDetails.cgst = 0;
      this.gstDetails.sgst = 0;
    } else {
      this.gstDetails.igst = 0;
      this.gstDetails.cgst = this.gstDetails.totalGst / 2;
      this.gstDetails.sgst = this.gstDetails.totalGst / 2;
    }
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
