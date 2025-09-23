const express = require('express');
const { body, validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const paymentService = require('../services/paymentService');
const gstService = require('../services/gstService');

const router = express.Router();

// Validation middleware for Indian payments
const validateIndianPayment = [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('currency').equals('INR').withMessage('Currency must be INR for Indian payments'),
  body('paymentMethod').isIn(['upi', 'card', 'netbanking', 'wallet', 'cash_on_delivery']).withMessage('Invalid payment method'),
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('userId').notEmpty().withMessage('User ID is required'),
  body('customerPhone').isMobilePhone('en-IN').withMessage('Valid Indian mobile number required'),
  body('billingAddress.state').notEmpty().withMessage('Billing state is required'),
  body('shippingAddress.state').notEmpty().withMessage('Shipping state is required')
];

// Get supported payment methods for India
router.get('/methods', (req, res) => {
  try {
    const methods = paymentService.getSupportedPaymentMethods();
    res.json({
      success: true,
      data: methods,
      country: 'India',
      currency: 'INR'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment methods',
      error: error.message
    });
  }
});

// Create payment
router.post('/create', validateIndianPayment, async (req, res) => {
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
      amount, 
      currency, 
      paymentMethod, 
      orderId, 
      userId, 
      customerPhone,
      customerEmail,
      customerName,
      billingAddress,
      shippingAddress,
      items,
      gstNumber
    } = req.body;

    // Check if payment already exists
    const existingPayment = await Payment.findOne({ orderId });
    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'Payment already exists for this order'
      });
    }

    // Calculate GST
    const isInterState = billingAddress.state !== shippingAddress.state;
    const gstDetails = gstService.calculateGST(amount, 18, isInterState);

    let paymentResult;
    let paymentProvider = 'razorpay';

    switch (paymentMethod) {
      case 'upi':
        paymentResult = await paymentService.createUPIPayment(amount, currency, orderId, {
          userId,
          customerPhone,
          customerEmail,
          customerName
        });
        break;
      case 'card':
        paymentResult = await paymentService.createCardPayment(amount, currency, orderId, {
          userId,
          customerPhone,
          customerEmail,
          customerName
        });
        break;
      case 'netbanking':
        paymentResult = await paymentService.createNetBankingPayment(amount, currency, orderId, {
          userId,
          customerPhone,
          customerEmail,
          customerName
        });
        break;
      case 'wallet':
        paymentResult = await paymentService.createWalletPayment(amount, currency, orderId, {
          userId,
          customerPhone,
          customerEmail,
          customerName
        });
        break;
      case 'cash_on_delivery':
        paymentResult = await paymentService.createCashOnDeliveryPayment(amount, currency, orderId, {
          userId,
          customerPhone,
          customerEmail,
          customerName
        });
        paymentProvider = 'cod';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid payment method'
        });
    }

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Payment creation failed',
        error: paymentResult.error
      });
    }

    // Create payment record
    const payment = new Payment({
      orderId,
      userId,
      amount,
      currency,
      paymentMethod,
      paymentProvider,
      status: 'pending',
      paymentDetails: paymentMethod === 'cash_on_delivery' ? {
        deliveryAddress: shippingAddress
      } : {
        razorpayOrderId: paymentResult.orderId
      },
      gstDetails: {
        gstNumber: gstNumber || null,
        gstRate: 18,
        ...gstDetails
      },
      metadata: {
        customerEmail,
        customerPhone,
        customerName,
        items: items || [],
        billingAddress,
        shippingAddress
      }
    });

    await payment.save();

    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: {
        paymentId: payment._id,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        gstDetails: payment.gstDetails,
        ...(paymentMethod !== 'cash_on_delivery' && { 
          razorpayOrderId: paymentResult.orderId,
          key: paymentResult.key 
        }),
        ...(paymentMethod === 'upi' && { upiApps: paymentResult.upiApps }),
        ...(paymentMethod === 'cash_on_delivery' && { 
          message: 'Order created for cash on delivery' 
        })
      }
    });

  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Confirm payment
router.post('/confirm', async (req, res) => {
  try {
    const { paymentId, paymentMethod, paymentData } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    let verificationResult;

    if (paymentMethod === 'cash_on_delivery') {
      verificationResult = { success: true, verified: true };
    } else {
      verificationResult = await paymentService.verifyRazorpayPayment(
        paymentData.razorpayOrderId,
        paymentData.razorpayPaymentId,
        paymentData.razorpaySignature
      );
    }

    if (!verificationResult.success || !verificationResult.verified) {
      payment.status = 'failed';
      await payment.save();
      
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        error: verificationResult.error
      });
    }

    // Update payment status
    payment.status = 'completed';
    if (paymentMethod !== 'cash_on_delivery') {
      payment.paymentDetails.razorpayPaymentId = paymentData.razorpayPaymentId;
      payment.paymentDetails.razorpaySignature = paymentData.razorpaySignature;
      if (paymentMethod === 'upi') {
        payment.paymentDetails.upiTransactionId = paymentData.razorpayPaymentId;
      }
    }
    await payment.save();

    // Update order status
    await Order.findOneAndUpdate(
      { orderId: payment.orderId },
      { 
        paymentStatus: 'paid',
        status: 'confirmed'
      }
    );

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      data: {
        paymentId: payment._id,
        status: payment.status,
        orderId: payment.orderId,
        gstDetails: payment.gstDetails
      }
    });

  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get payment status
router.get('/status/:paymentId', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: {
        paymentId: payment._id,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        gstDetails: payment.gstDetails,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt
      }
    });

  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Refund payment
router.post('/refund', async (req, res) => {
  try {
    const { paymentId, amount, reason } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed payments can be refunded'
      });
    }

    const refundAmount = amount || payment.amount;
    const refundResult = await paymentService.refundPayment(
      payment.paymentDetails.razorpayPaymentId,
      refundAmount,
      reason,
      payment.paymentProvider
    );

    if (!refundResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Refund failed',
        error: refundResult.error
      });
    }

    // Update payment status
    payment.status = 'refunded';
    payment.refundDetails = {
      refundId: refundResult.refundId,
      refundAmount: refundAmount,
      refundReason: reason,
      refundedAt: new Date(),
      refundStatus: 'processed'
    };
    await payment.save();

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refundId: refundResult.refundId,
        refundAmount: refundAmount
      }
    });

  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
