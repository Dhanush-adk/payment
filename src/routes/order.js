const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/OrderMySQL');
const Payment = require('../models/PaymentMySQL');
const gstService = require('../services/gstService');

const router = express.Router();

// Create order
router.post('/create', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('totalAmount').isNumeric().withMessage('Total amount must be a number'),
  body('shippingAddress.state').notEmpty().withMessage('Shipping state is required'),
  body('billingAddress.state').notEmpty().withMessage('Billing state is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { 
      userId, 
      items, 
      totalAmount, 
      shippingAddress, 
      billingAddress, 
      paymentMethod,
      gstNumber 
    } = req.body;

    // Generate unique order ID
    const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate GST
    const isInterState = billingAddress.state !== shippingAddress.state;
    const gstDetails = gstService.calculateGST(totalAmount, 18, isInterState);

    const orderData = {
      orderId,
      userId,
      items,
      subtotal: totalAmount / 1.18, // Remove GST to get subtotal
      gstAmount: gstDetails.gstAmount,
      totalAmount: totalAmount,
      currency: 'INR',
      shippingName: shippingAddress.name,
      shippingStreet: shippingAddress.street,
      shippingCity: shippingAddress.city,
      shippingState: shippingAddress.state,
      shippingPincode: shippingAddress.pincode,
      shippingCountry: shippingAddress.country || 'India',
      shippingPhone: shippingAddress.phone,
      shippingLandmark: shippingAddress.landmark,
      billingName: billingAddress.name,
      billingStreet: billingAddress.street,
      billingCity: billingAddress.city,
      billingState: billingAddress.state,
      billingPincode: billingAddress.pincode,
      billingCountry: billingAddress.country || 'India',
      billingPhone: billingAddress.phone,
      paymentMethod,
      gstNumber: gstNumber || null,
      isGstRegistered: !!gstNumber,
      gstRate: 18,
      cgst: gstDetails.cgst,
      sgst: gstDetails.sgst,
      igst: gstDetails.igst,
      totalGst: gstDetails.totalGst
    };

    const order = await Order.create(orderData);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderId: order.orderId,
        totalAmount: order.totalAmount,
        gstDetails: {
          gstNumber: order.gstNumber,
          gstRate: order.gstRate,
          cgst: order.cgst,
          sgst: order.sgst,
          igst: order.igst,
          totalGst: order.totalGst
        },
        status: order.status,
        paymentMethod: order.paymentMethod
      }
    });

  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get order details
router.get('/:orderId', async (req, res) => {
  try {
    const order = await Order.findOne({ where: { orderId: req.params.orderId } });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Get payment details
    const payment = await Payment.findOne({ orderId: order.orderId });

    res.json({
      success: true,
      data: {
        order: {
          orderId: order.orderId,
          userId: order.userId,
          items: order.items,
          pricing: order.pricing,
          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          shippingAddress: order.shippingAddress,
          billingAddress: order.billingAddress,
          gstDetails: order.gstDetails,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt
        },
        payment: payment ? {
          paymentId: payment._id,
          status: payment.status,
          paymentMethod: payment.paymentMethod,
          amount: payment.amount,
          gstDetails: payment.gstDetails
        } : null
      }
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update order status
router.patch('/:orderId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const order = await Order.findOneAndUpdate(
      { orderId: req.params.orderId },
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        orderId: order.orderId,
        status: order.status
      }
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get orders by user
router.get('/user/:userId', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const orders = await Order.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments({ userId: req.params.userId });

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalOrders: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Cancel order
router.patch('/:orderId/cancel', async (req, res) => {
  try {
    const { reason } = req.body;

    const order = await Order.findOne({ where: { orderId: req.params.orderId } });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (['shipped', 'delivered'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel order that is already shipped or delivered'
      });
    }

    order.status = 'cancelled';
    await order.save();

    // If payment was made, initiate refund
    if (order.paymentStatus === 'paid') {
      const payment = await Payment.findOne({ orderId: order.orderId });
      if (payment && payment.status === 'completed') {
        // This would trigger refund process
        payment.status = 'refunded';
        payment.refundDetails = {
          refundReason: reason || 'Order cancelled',
          refundedAt: new Date(),
          refundStatus: 'pending'
        };
        await payment.save();
      }
    }

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        orderId: order.orderId,
        status: order.status
      }
    });

  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
