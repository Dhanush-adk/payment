const express = require('express');
const crypto = require('crypto');
const { pool } = require('../models/db');

const router = express.Router();

// Razorpay webhook – verify signature with raw body, then handle event
router.post(
  '/razorpay',
  express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }),
  (req, res, next) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const sig = req.headers['x-razorpay-signature'];
    if (secret && sig) {
      const expected = crypto
        .createHmac('sha256', secret)
        .update(req.rawBody || Buffer.from(''))
        .digest('hex');
      if (expected !== sig) {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }
    next();
  },
  async (req, res) => {
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
  }
);

async function handleRazorpayPaymentSuccess(payment) {
  try {
    const [rows] = await pool.query(
      `SELECT pd.payment_id, pi.order_id
       FROM payment_details pd
       JOIN payment_info pi ON pi.id = pd.payment_id
       WHERE pd.razorpay_order_id = ? LIMIT 1`,
      [payment.order_id]
    );
    const row = rows?.[0];
    if (!row) return;

    await pool.execute(
      'UPDATE payment_info SET status = ? WHERE id = ?',
      ['completed', row.payment_id]
    );
    await pool.execute(
      `UPDATE payment_details
       SET razorpay_payment_id = ?, razorpay_signature = NULL
       WHERE payment_id = ?`,
      [payment.id, row.payment_id]
    );
    if (payment.method === 'card' && payment.card) {
      await pool.execute(
        `UPDATE payment_details SET card_last4 = ?, card_brand = ?, card_type = ? WHERE payment_id = ?`,
        [
          payment.card.last4 ?? null,
          payment.card.network ?? null,
          payment.card.type ?? null,
          row.payment_id,
        ]
      );
    }
    if (payment.method === 'upi') {
      await pool.execute(
        `UPDATE payment_details SET upi_id = ?, upi_app = ?, upi_transaction_id = ? WHERE payment_id = ?`,
        [
          payment.vpa ?? null,
          payment.wallet ?? null,
          payment.id ?? null,
          row.payment_id,
        ]
      );
    }

    if (row.order_id != null) {
      await pool.execute(
        `UPDATE norders SET payment_status = 'PAID', order_status = 'CONFIRMED' WHERE order_id = ?`,
        [row.order_id]
      );
    }

    console.log(`Razorpay payment ${row.payment_id} completed successfully`);
  } catch (error) {
    console.error('Error handling Razorpay payment success:', error);
  }
}

async function handleRazorpayPaymentFailure(payment) {
  try {
    const [rows] = await pool.query(
      `SELECT pd.payment_id FROM payment_details pd WHERE pd.razorpay_order_id = ? LIMIT 1`,
      [payment.order_id]
    );
    const row = rows?.[0];
    if (!row) return;

    await pool.execute(
      'UPDATE payment_info SET status = ? WHERE id = ?',
      ['failed', row.payment_id]
    );
    console.log(`Razorpay payment ${row.payment_id} failed`);
  } catch (error) {
    console.error('Error handling Razorpay payment failure:', error);
  }
}

async function handleRazorpayOrderPaid(order) {
  try {
    const [rows] = await pool.query(
      `SELECT pd.payment_id, pi.order_id
       FROM payment_details pd
       JOIN payment_info pi ON pi.id = pd.payment_id
       WHERE pd.razorpay_order_id = ? LIMIT 1`,
      [order.id]
    );
    const row = rows?.[0];
    if (!row) return;

    await pool.execute(
      'UPDATE payment_info SET status = ? WHERE id = ?',
      ['completed', row.payment_id]
    );
    if (row.order_id != null) {
      await pool.execute(
        `UPDATE norders SET payment_status = 'PAID', order_status = 'CONFIRMED' WHERE order_id = ?`,
        [row.order_id]
      );
    }
    console.log(`Razorpay order ${order.id} paid successfully`);
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
    console.log(`PhonePe webhook event: ${event}`, data);
  } catch (error) {
    console.error('Error handling PhonePe webhook:', error);
  }
}

async function handlePayUWebhook(event, data) {
  try {
    console.log(`PayU webhook event: ${event}`, data);
  } catch (error) {
    console.error('Error handling PayU webhook:', error);
  }
}

router.get('/verify', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook endpoint is active',
    timestamp: new Date().toISOString(),
    supportedProviders: ['razorpay', 'phonepe', 'payu'],
  });
});

module.exports = router;
