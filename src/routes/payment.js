const express = require('express');
const { body, validationResult } = require('express-validator');
const Payment = require('../models/PaymentMySQL');
const Order = require('../models/OrderMySQL');
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
    const existingPayment = await Payment.findOne({ where: { orderId } });
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
    const paymentData = {
      orderId,
      userId,
      amount,
      currency,
      paymentMethod,
      paymentProvider,
      status: 'pending',
      gstNumber: gstNumber || null,
      gstRate: 18,
      customerEmail,
      customerPhone,
      customerName,
      description: items ? items.map(item => `${item.name} x${item.quantity}`).join(', ') : null,
      billingName: billingAddress.name,
      billingStreet: billingAddress.street,
      billingCity: billingAddress.city,
      billingState: billingAddress.state,
      billingPincode: billingAddress.pincode,
      billingCountry: billingAddress.country || 'India'
    };

    // Add payment method specific details
    if (paymentMethod === 'cash_on_delivery') {
      paymentData.deliveryName = shippingAddress.name;
      paymentData.deliveryStreet = shippingAddress.street;
      paymentData.deliveryCity = shippingAddress.city;
      paymentData.deliveryState = shippingAddress.state;
      paymentData.deliveryPincode = shippingAddress.pincode;
      paymentData.deliveryCountry = shippingAddress.country || 'India';
      paymentData.deliveryPhone = shippingAddress.phone;
      paymentData.deliveryLandmark = shippingAddress.landmark;
    } else {
      paymentData.razorpayOrderId = paymentResult.orderId;
    }

    const payment = await Payment.create(paymentData);

    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: {
        paymentId: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        gstDetails: {
          gstNumber: payment.gstNumber,
          gstRate: payment.gstRate,
          cgst: payment.cgst,
          sgst: payment.sgst,
          igst: payment.igst,
          totalGst: payment.totalGst,
          taxableAmount: payment.taxableAmount
        },
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

    const payment = await Payment.findByPk(paymentId);
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
      await payment.update({ status: 'failed' });
      
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        error: verificationResult.error
      });
    }

    // Update payment status
    const updateData = { status: 'completed' };
    if (paymentMethod !== 'cash_on_delivery') {
      updateData.razorpayPaymentId = paymentData.razorpayPaymentId;
      updateData.razorpaySignature = paymentData.razorpaySignature;
      if (paymentMethod === 'upi') {
        updateData.upiTransactionId = paymentData.razorpayPaymentId;
      }
    }
    await payment.update(updateData);

    // Update order status
    await Order.update(
      { 
        paymentStatus: 'paid',
        status: 'confirmed'
      },
      { where: { orderId: payment.orderId } }
    );

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      data: {
        paymentId: payment.id,
        status: payment.status,
        orderId: payment.orderId,
        gstDetails: {
          gstNumber: payment.gstNumber,
          gstRate: payment.gstRate,
          cgst: payment.cgst,
          sgst: payment.sgst,
          igst: payment.igst,
          totalGst: payment.totalGst,
          taxableAmount: payment.taxableAmount
        }
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
    const payment = await Payment.findByPk(req.params.paymentId);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        gstDetails: {
          gstNumber: payment.gstNumber,
          gstRate: payment.gstRate,
          cgst: payment.cgst,
          sgst: payment.sgst,
          igst: payment.igst,
          totalGst: payment.totalGst,
          taxableAmount: payment.taxableAmount
        },
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

    const payment = await Payment.findByPk(paymentId);
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
      payment.razorpayPaymentId,
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
    await payment.update({
      status: 'refunded',
      refundId: refundResult.refundId,
      refundAmount: refundAmount,
      refundReason: reason,
      refundedAt: new Date(),
      refundStatus: 'processed'
    });

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
