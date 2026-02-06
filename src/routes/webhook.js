const express = require('express');
const crypto = require('crypto');
const Payment = require('../models/PaymentMySQL');
const Order = require('../models/OrderMySQL');

const router = express.Router();

// Razorpay webhook – verify signature with raw body, then handle event
router.post('/razorpay', express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }), (req, res, next) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const sig = req.headers['x-razorpay-signature'];
  if (secret && sig) {
    const expected = crypto.createHmac('sha256', secret).update(req.rawBody || Buffer.from('')).digest('hex');
    if (expected !== sig) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }
  }
  next();
}, async (req, res) => {
  const { event, payload } = req.body;

  try {
    switch (event) {
      case 'payment.captured':
        await handleRazorpayPaymentSuccess(payload.payment.entity);
        break;
      case 'payment.failed':
        await handleRazorpayPaymentFailure(payload.payment.entity);
        break;
      case 'order.paid':
        await handleRazorpayOrderPaid(payload.order.entity);
        break;
      default:
        console.log(`Unhandled Razorpay event: ${event}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Razorpay webhook error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

async function handleRazorpayPaymentSuccess(payment) {
  try {
    const paymentRecord = await Payment.findOne({
      where: { razorpayOrderId: payment.order_id }
    });

    if (paymentRecord) {
      await paymentRecord.update({
        status: 'completed',
        razorpayPaymentId: payment.id,
        upiTransactionId: payment.id,
        ...(payment.method === 'card' && {
          cardLast4: payment.card?.last4,
          cardBrand: payment.card?.network,
          cardType: payment.card?.type
        }),
        ...(payment.method === 'upi' && {
          upiId: payment.vpa,
          upiApp: payment.wallet
        })
      });

      // Update order status
      await Order.update(
        { 
          paymentStatus: 'paid',
          status: 'confirmed'
        },
        { where: { orderId: paymentRecord.orderId } }
      );

      console.log(`Razorpay payment ${paymentRecord._id} completed successfully`);
    }
  } catch (error) {
    console.error('Error handling Razorpay payment success:', error);
  }
}

async function handleRazorpayPaymentFailure(payment) {
  try {
    const paymentRecord = await Payment.findOne({
      where: { razorpayOrderId: payment.order_id }
    });

    if (paymentRecord) {
      await paymentRecord.update({ status: 'failed' });

      console.log(`Razorpay payment ${paymentRecord.id} failed`);
    }
  } catch (error) {
    console.error('Error handling Razorpay payment failure:', error);
  }
}

async function handleRazorpayOrderPaid(order) {
  try {
    const paymentRecord = await Payment.findOne({
      'paymentDetails.razorpayOrderId': order.id
    });

    if (paymentRecord) {
      paymentRecord.status = 'completed';
      await paymentRecord.save();

      // Update order status
      await Order.update(
        { 
          paymentStatus: 'paid',
          status: 'confirmed'
        },
        { where: { orderId: paymentRecord.orderId } }
      );

      console.log(`Razorpay order ${order.id} paid successfully`);
    }
  } catch (error) {
    console.error('Error handling Razorpay order paid:', error);
  }
}

// Generic webhook handler for other payment providers
router.post('/generic', express.json(), async (req, res) => {
  try {
    const { provider, event, data } = req.body;

    switch (provider) {
      case 'phonepe':
        await handlePhonePeWebhook(event, data);
        break;
      case 'payu':
        await handlePayUWebhook(event, data);
        break;
      default:
        console.log(`Unhandled webhook provider: ${provider}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Generic webhook error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

async function handlePhonePeWebhook(event, data) {
  try {
    // Handle PhonePe specific webhook events
    console.log(`PhonePe webhook event: ${event}`, data);
    
    // Implement PhonePe webhook handling logic here
    // This would depend on PhonePe's webhook structure
    
  } catch (error) {
    console.error('Error handling PhonePe webhook:', error);
  }
}

async function handlePayUWebhook(event, data) {
  try {
    // Handle PayU specific webhook events
    console.log(`PayU webhook event: ${event}`, data);
    
    // Implement PayU webhook handling logic here
    // This would depend on PayU's webhook structure
    
  } catch (error) {
    console.error('Error handling PayU webhook:', error);
  }
}

// Webhook verification endpoint
router.get('/verify', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook endpoint is active',
    timestamp: new Date().toISOString(),
    supportedProviders: ['razorpay', 'phonepe', 'payu']
  });
});

module.exports = router;
