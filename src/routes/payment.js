const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../models/db');
const paymentService = require('../services/paymentService');
const gstService = require('../services/gstService');

const router = express.Router();

// Validation: trendRushBackend-style – require addressId for billing/shipping
const validateIndianPayment = [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('currency').equals('INR').withMessage('Currency must be INR for Indian payments'),
  body('paymentMethod')
    .isIn(['upi', 'card', 'netbanking', 'wallet', 'cash_on_delivery'])
    .withMessage('Invalid payment method'),
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('userId').notEmpty().withMessage('User ID is required'),
  body('customerPhone').isMobilePhone('en-IN').withMessage('Valid Indian mobile number required'),
  body('billingAddress.addressId').notEmpty().withMessage('Billing addressId is required'),
  body('shippingAddress.addressId').notEmpty().withMessage('Shipping addressId is required'),
];

/**
 * Resolve incoming order identifier (numeric order_id or order_number like ORD-...).
 * Returns numeric order_id (BIGINT) or throws if not found.
 */
async function resolveOrderNumericId(conn, incomingOrderId) {
  if (typeof incomingOrderId === 'number' && Number.isFinite(incomingOrderId)) {
    const [[row]] = await conn.query(
      'SELECT order_id FROM norders WHERE order_id = ? LIMIT 1',
      [incomingOrderId]
    );
    if (!row) throw new Error('Order not found');
    return Number(incomingOrderId);
  }

  if (typeof incomingOrderId === 'string') {
    const numeric = Number(incomingOrderId);
    if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
      const [[row]] = await conn.query(
        'SELECT order_id FROM norders WHERE order_id = ? LIMIT 1',
        [numeric]
      );
      if (row) return numeric;
    }
    const [[byNumberRow]] = await conn.query(
      'SELECT order_id FROM norders WHERE order_number = ? LIMIT 1',
      [incomingOrderId]
    );
    if (!byNumberRow) throw new Error('Order not found by order_number');
    return Number(byNumberRow.order_id);
  }

  throw new Error('Invalid orderId');
}

// Get supported payment methods for India
router.get('/methods', (req, res) => {
  try {
    const methods = paymentService.getSupportedPaymentMethods();
    res.json({
      success: true,
      data: methods,
      country: 'India',
      currency: 'INR',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment methods',
      error: error.message,
    });
  }
});

// Create payment (trendRush structure: payment_info + details + gst + metadata + billing_address + metadata_items)
router.post('/create', validateIndianPayment, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const {
    amount,
    currency,
    paymentMethod,
    orderId: incomingOrderId,
    userId,
    customerPhone,
    customerEmail,
    customerName,
    billingAddress,
    shippingAddress,
    items,
    gstNumber,
  } = req.body;

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const resolvedOrderId = await resolveOrderNumericId(conn, incomingOrderId);

    const [existingRows] = await conn.query(
      'SELECT id FROM payment_info WHERE order_id = ? LIMIT 1',
      [resolvedOrderId]
    );
    if (existingRows && existingRows.length > 0) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Payment already exists for this order',
      });
    }

    const isInterState =
      (billingAddress.addressState !== shippingAddress.addressState) ||
      (billingAddress.state !== shippingAddress.state) ||
      billingAddress.state === undefined;
    const gstCalc = gstService.calculateGST(Number(amount), 18, isInterState);

    let paymentProvider = 'razorpay';
    if (paymentMethod === 'cash_on_delivery') paymentProvider = 'cod';

    let paymentResult;
    switch (paymentMethod) {
      case 'upi':
        paymentResult = await paymentService.createUPIPayment(amount, currency, String(resolvedOrderId), {
          userId,
          customerPhone,
          customerEmail,
          customerName,
        });
        break;
      case 'card':
        paymentResult = await paymentService.createCardPayment(amount, currency, String(resolvedOrderId), {
          userId,
          customerPhone,
          customerEmail,
          customerName,
        });
        break;
      case 'netbanking':
        paymentResult = await paymentService.createNetBankingPayment(amount, currency, String(resolvedOrderId), {
          userId,
          customerPhone,
          customerEmail,
          customerName,
        });
        break;
      case 'wallet':
        paymentResult = await paymentService.createWalletPayment(amount, currency, String(resolvedOrderId), {
          userId,
          customerPhone,
          customerEmail,
          customerName,
        });
        break;
      case 'cash_on_delivery':
        paymentResult = await paymentService.createCashOnDeliveryPayment(amount, currency, String(resolvedOrderId), {
          userId,
          customerPhone,
          customerEmail,
          customerName,
        });
        break;
      default:
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    if (!paymentResult || !paymentResult.success) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Payment creation failed',
        error: paymentResult?.error,
      });
    }

    const [insertInfoResult] = await conn.execute(
      `INSERT INTO payment_info
        (order_id, user_id, amount, currency, payment_method, payment_provider, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        resolvedOrderId,
        userId,
        Number(amount),
        currency ?? 'INR',
        paymentMethod,
        paymentProvider,
        'pending',
      ]
    );
    const paymentId = insertInfoResult.insertId;

    const addressId = shippingAddress?.addressId ?? shippingAddress?.address_id;
    if (!addressId) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'shippingAddress.addressId is required' });
    }

    await conn.execute(
      `INSERT INTO payment_details (
         payment_id, upi_id, upi_app, upi_transaction_id,
         card_last4, card_brand, card_type,
         razorpay_payment_id, razorpay_order_id, razorpay_signature,
         payu_payment_id, payu_transaction_id,
         phonepe_transaction_id, phonepe_merchant_transaction_id,
         address_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentId,
        paymentMethod === 'upi' ? paymentResult.upiId ?? null : null,
        paymentMethod === 'upi' ? paymentResult.upiApp ?? null : null,
        null,
        null,
        null,
        null,
        paymentResult.razorpayPaymentId ?? null,
        paymentResult.orderId ?? paymentResult.razorpayOrderId ?? null,
        paymentResult.razorpaySignature ?? null,
        paymentResult.payuPaymentId ?? null,
        paymentResult.payuTransactionId ?? null,
        paymentResult.phonepeTransactionId ?? null,
        paymentResult.phonepeMerchantTransactionId ?? null,
        addressId,
      ]
    );

    await conn.execute(
      `INSERT INTO payment_gst_details
        (payment_id, gst_number, gst_rate, cgst, sgst, igst, total_gst, taxable_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentId,
        gstNumber ?? null,
        gstCalc.gstRate ?? 18,
        gstCalc.cgst ?? 0,
        gstCalc.sgst ?? 0,
        gstCalc.igst ?? 0,
        gstCalc.gstAmount ?? gstCalc.totalGst ?? 0,
        gstCalc.taxableAmount ?? 0,
      ]
    );

    await conn.execute(
      'INSERT INTO payment_metadata (payment_id, user_id, description) VALUES (?, ?, ?)',
      [paymentId, userId, req.body.description ?? null]
    );

    const billingAddressId = billingAddress?.addressId ?? billingAddress?.address_id;
    if (billingAddressId) {
      await conn.execute(
        'INSERT INTO payment_billing_address (payment_id, address_id) VALUES (?, ?)',
        [paymentId, billingAddressId]
      );
    }

    if (Array.isArray(items) && items.length > 0) {
      const itemValues = items.map((it) => [
        paymentId,
        it.name ?? it.product_name ?? null,
        it.quantity ?? it.qty ?? 1,
        Number(it.price ?? 0),
        it.gstRate ?? it.gst_rate ?? 18,
        it.hsnCode ?? it.hsn_code ?? null,
      ]);
      await conn.query(
        'INSERT INTO payment_metadata_items (payment_id, name, quantity, price, gst_rate, hsn_code) VALUES ?',
        [itemValues]
      );
    }

    await conn.commit();

    const gstDetails = {
      gstRate: gstCalc.gstRate ?? 18,
      totalGst: gstCalc.gstAmount ?? gstCalc.totalGst ?? 0,
      taxableAmount: gstCalc.taxableAmount ?? 0,
      cgst: gstCalc.cgst ?? 0,
      sgst: gstCalc.sgst ?? 0,
      igst: gstCalc.igst ?? 0,
    };

    const data = {
      paymentId,
      orderId: resolvedOrderId,
      amount: Number(amount),
      currency: currency ?? 'INR',
      paymentMethod,
      status: 'pending',
      gstDetails,
    };
    if (paymentMethod !== 'cash_on_delivery') {
      data.razorpayOrderId = paymentResult.orderId ?? paymentResult.razorpayOrderId ?? null;
      data.key = paymentResult.key ?? null;
    }
    if (paymentMethod === 'upi') data.upiApps = paymentResult.upiApps ?? null;
    if (paymentMethod === 'cash_on_delivery') data.message = 'Order created for cash on delivery';

    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data,
    });
  } catch (err) {
    console.error('POST /payments/create error:', err);
    if (conn) {
      try {
        await conn.rollback();
      } catch (_) {}
      conn.release?.();
    }
    res.status(500).json({
      success: false,
      message: err.message || 'Internal server error',
      error: err.message,
    });
  } finally {
    if (conn) conn.release?.();
  }
});

// Confirm payment
router.post('/confirm', async (req, res) => {
  const { paymentId, paymentMethod, paymentData } = req.body;
  if (!paymentId) {
    return res.status(400).json({ success: false, message: 'paymentId required' });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT pi.*, pd.razorpay_order_id, pd.razorpay_payment_id
       FROM payment_info pi
       LEFT JOIN payment_details pd ON pd.payment_id = pi.id
       WHERE pi.id = ? LIMIT 1`,
      [paymentId]
    );
    const paymentRow = rows?.[0];
    if (!paymentRow) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    let verificationResult = { success: true, verified: true };
    if (paymentMethod !== 'cash_on_delivery') {
      verificationResult = await paymentService.verifyRazorpayPayment(
        paymentData?.razorpayOrderId,
        paymentData?.razorpayPaymentId,
        paymentData?.razorpaySignature
      );
    }

    if (!verificationResult.success || !verificationResult.verified) {
      await conn.execute('UPDATE payment_info SET status = ? WHERE id = ?', ['failed', paymentId]);
      await conn.commit();
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        error: verificationResult.error,
      });
    }

    await conn.execute('UPDATE payment_info SET status = ? WHERE id = ?', ['completed', paymentId]);

    if (paymentMethod !== 'cash_on_delivery' && paymentData) {
      await conn.execute(
        `UPDATE payment_details
         SET razorpay_payment_id = ?, razorpay_signature = ?
         WHERE payment_id = ?`,
        [paymentData.razorpayPaymentId, paymentData.razorpaySignature, paymentId]
      );
    }

    await conn.execute(
      `UPDATE norders SET payment_status = 'PAID', order_status = 'CONFIRMED' WHERE order_id = ?`,
      [paymentRow.order_id]
    );

    await conn.commit();

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      data: {
        paymentId: Number(paymentId),
        status: 'completed',
        orderId: paymentRow.order_id,
        gstDetails: undefined,
      },
    });
  } catch (err) {
    console.error('POST /payments/confirm error:', err);
    if (conn) {
      try {
        await conn.rollback();
      } catch (_) {}
      conn.release?.();
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
    });
  } finally {
    if (conn) conn.release?.();
  }
});

// Get payment status
router.get('/status/:paymentId', async (req, res) => {
  const paymentId = Number(req.params.paymentId);
  if (!paymentId) {
    return res.status(400).json({ success: false, message: 'Invalid paymentId' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT pi.*, pd.address_id AS shipping_address_id, pg.gst_rate, pg.total_gst, pg.taxable_amount, pm.user_id
       FROM payment_info pi
       LEFT JOIN payment_details pd ON pd.payment_id = pi.id
       LEFT JOIN payment_gst_details pg ON pg.payment_id = pi.id
       LEFT JOIN payment_metadata pm ON pm.payment_id = pi.id
       WHERE pi.id = ? LIMIT 1`,
      [paymentId]
    );
    const payment = rows?.[0];
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        orderId: payment.order_id,
        amount: Number(payment.amount),
        currency: payment.currency,
        paymentMethod: payment.payment_method,
        paymentProvider: payment.payment_provider,
        status: payment.status,
        gstDetails: {
          gstRate: payment.gst_rate,
          totalGst: payment.total_gst,
          taxableAmount: payment.taxable_amount,
        },
        createdAt: payment.created_at,
        updatedAt: payment.updated_at,
      },
    });
  } catch (err) {
    console.error('GET /payments/status error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
    });
  }
});

// Refund
router.post('/refund', async (req, res) => {
  const { paymentId, amount, reason } = req.body;
  if (!paymentId) {
    return res.status(400).json({ success: false, message: 'paymentId required' });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT pi.*, pd.razorpay_payment_id, pi.payment_provider
       FROM payment_info pi
       LEFT JOIN payment_details pd ON pd.payment_id = pi.id
       WHERE pi.id = ? LIMIT 1`,
      [paymentId]
    );
    const payment = rows?.[0];
    if (!payment) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (payment.status !== 'completed') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Only completed payments can be refunded',
      });
    }

    const refundAmount = Number(amount ?? payment.amount);

    const refundResult = await paymentService.refundPayment(
      payment.razorpay_payment_id ?? null,
      refundAmount,
      reason ?? null,
      payment.payment_provider
    );

    if (!refundResult || !refundResult.success) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Refund failed',
        error: refundResult?.error,
      });
    }

    await conn.execute(
      `INSERT INTO payment_refunds (payment_id, refund_reference, refund_amount, refund_reason, refunded_at, refund_status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        paymentId,
        refundResult.refundId ?? refundResult.refund_reference ?? null,
        refundAmount,
        reason ?? null,
        new Date(),
        'processed',
      ]
    );

    await conn.execute('UPDATE payment_info SET status = ? WHERE id = ?', ['refunded', paymentId]);

    await conn.commit();

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refundId: refundResult.refundId ?? refundResult.refund_reference ?? null,
        refundAmount,
      },
    });
  } catch (err) {
    console.error('POST /payments/refund error:', err);
    if (conn) {
      try {
        await conn.rollback();
      } catch (_) {}
      conn.release?.();
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message,
    });
  } finally {
    if (conn) conn.release?.();
  }
});

module.exports = router;
