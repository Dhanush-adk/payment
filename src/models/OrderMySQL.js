const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('Order', {
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
  
  // Items (stored as JSON)
  items: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  
  // Pricing
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  gstAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'INR'
  },
  
  // Status
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'),
    allowNull: false,
    defaultValue: 'pending'
  },
  
  // Shipping Address
  shippingName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  shippingStreet: {
    type: DataTypes.STRING,
    allowNull: true
  },
  shippingCity: {
    type: DataTypes.STRING,
    allowNull: true
  },
  shippingState: {
    type: DataTypes.STRING,
    allowNull: true
  },
  shippingPincode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  shippingCountry: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'India'
  },
  shippingPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  shippingLandmark: {
    type: DataTypes.STRING,
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
  billingPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  // Payment
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
    allowNull: false,
    defaultValue: 'pending'
  },
  paymentMethod: {
    type: DataTypes.ENUM('upi', 'card', 'netbanking', 'wallet', 'cash_on_delivery'),
    allowNull: true
  },
  
  // GST Details
  gstNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isGstRegistered: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
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
  
  // Delivery
  estimatedDelivery: {
    type: DataTypes.DATE,
    allowNull: true
  },
  trackingNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  courierPartner: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deliveryInstructions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Compliance
  rbiCompliant: {
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
  tableName: 'orders',
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
      name: 'idx_payment_status',
      fields: ['paymentStatus']
    },
    {
      name: 'idx_created_at',
      fields: ['createdAt']
    }
  ],
  hooks: {
    beforeSave: async (order) => {
      // Calculate pricing before saving
      if (order.changed('items') && order.items && order.items.length > 0) {
        order.subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const gstRate = order.gstRate || 18;
        order.gstAmount = (order.subtotal * gstRate) / 100;
        order.totalAmount = order.subtotal + order.gstAmount;
        
        // Calculate GST breakdown
        const isInterState = order.billingState !== order.shippingState;
        
        if (isInterState) {
          order.igst = order.gstAmount;
          order.cgst = 0;
          order.sgst = 0;
        } else {
          order.igst = 0;
          order.cgst = order.gstAmount / 2;
          order.sgst = order.gstAmount / 2;
        }
        
        order.totalGst = order.gstAmount;
      }
    }
  }
});

module.exports = Order;
