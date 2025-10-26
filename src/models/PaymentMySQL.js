const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  orderId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'INR'
  },
  paymentMethod: {
    type: DataTypes.ENUM('upi', 'card', 'netbanking', 'wallet', 'cash_on_delivery'),
    allowNull: false
  },
  paymentProvider: {
    type: DataTypes.ENUM('razorpay', 'payu', 'phonepe', 'cod'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'),
    allowNull: false,
    defaultValue: 'pending'
  },
  
  // UPI Payment Details
  upiId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  upiApp: {
    type: DataTypes.STRING,
    allowNull: true
  },
  upiTransactionId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  // Card Payment Details
  cardLast4: {
    type: DataTypes.STRING(4),
    allowNull: true
  },
  cardBrand: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cardType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  // Razorpay Details
  razorpayPaymentId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  razorpayOrderId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  razorpaySignature: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // PayU Details
  payuPaymentId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  payuTransactionId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  // PhonePe Details
  phonepeTransactionId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phonepeMerchantTransactionId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  // Cash on Delivery - Delivery Address
  deliveryName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deliveryStreet: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deliveryCity: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deliveryState: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deliveryPincode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deliveryCountry: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'India'
  },
  deliveryPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deliveryLandmark: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  // GST Details
  gstNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  gstRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 18
  },
  cgst: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  sgst: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  igst: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  totalGst: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  taxableAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  
  // Customer Metadata
  customerEmail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  customerPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  customerName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Billing Address
  billingName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  billingStreet: {
    type: DataTypes.STRING,
    allowNull: true
  },
  billingCity: {
    type: DataTypes.STRING,
    allowNull: true
  },
  billingState: {
    type: DataTypes.STRING,
    allowNull: true
  },
  billingPincode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  billingCountry: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'India'
  },
  
  // Refund Details
  refundId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  refundAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  refundReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  refundedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  refundStatus: {
    type: DataTypes.ENUM('pending', 'processed', 'failed'),
    allowNull: true
  },
  
  // Compliance
  rbiCompliant: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  pciCompliant: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  dataRetention: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: () => new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000) // 7 years
  }
}, {
  tableName: 'payments',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    {
      name: 'idx_order_id',
      fields: ['orderId']
    },
    {
      name: 'idx_user_id',
      fields: ['userId']
    },
    {
      name: 'idx_status',
      fields: ['status']
    },
    {
      name: 'idx_created_at',
      fields: ['createdAt']
    },
    {
      name: 'idx_upi_transaction_id',
      fields: ['upiTransactionId']
    },
    {
      name: 'idx_razorpay_payment_id',
      fields: ['razorpayPaymentId']
    }
  ],
  hooks: {
    beforeSave: async (payment) => {
      // Calculate GST before saving
      if (payment.changed('amount') && payment.amount > 0) {
        const gstRate = payment.gstRate || 18;
        payment.taxableAmount = payment.amount / (1 + gstRate / 100);
        payment.totalGst = payment.amount - payment.taxableAmount;
        
        // For inter-state transactions, use IGST; for intra-state, use CGST+SGST
        const isInterState = payment.billingState !== payment.deliveryState;
        
        if (isInterState) {
          payment.igst = payment.totalGst;
          payment.cgst = 0;
          payment.sgst = 0;
        } else {
          payment.igst = 0;
          payment.cgst = payment.totalGst / 2;
          payment.sgst = payment.totalGst / 2;
        }
      }
    }
  }
});

module.exports = Payment;
