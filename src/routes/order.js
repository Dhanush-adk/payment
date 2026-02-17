const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../models/db');
const gstService = require('../services/gstService');

const router = express.Router();

/**
 * Insert address into addresses table; returns address id.
 */
async function insertAddress(conn, userId, addr) {
  if (!addr || (!addr.addressId && !addr.name)) return null;
  const [r] = await conn.execute(
    `INSERT INTO addresses (user_id, name, street, city, state, pincode, country, phone, landmark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      addr.name ?? null,
      addr.street ?? addr.addressLine1 ?? null,
      addr.city ?? null,
      addr.state ?? null,
      addr.pincode ?? addr.pinCode ?? null,
      addr.country ?? 'India',
      addr.phone ?? null,
      addr.landmark ?? null,
    ]
  );
  return r.insertId;
}

// Create order (norders + optional addresses + order_items)
router.post(
  '/create',
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('totalAmount').isNumeric().withMessage('Total amount must be a number'),
    body('shippingAddress').exists().withMessage('Shipping address is required'),
    body('billingAddress').exists().withMessage('Billing address is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const {
        userId,
        items,
        totalAmount,
        shippingAddress,
        billingAddress,
        paymentMethod,
        gstNumber,
      } = req.body;

      const orderNumber = `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const isInterState =
        (billingAddress.state || billingAddress.addressState) !==
        (shippingAddress.state || shippingAddress.addressState);
      const gstDetails = gstService.calculateGST(Number(totalAmount), 18, isInterState);
      const subtotal = gstDetails.taxableAmount ?? Number(totalAmount) / 1.18;
      const tax = gstDetails.gstAmount ?? Number(totalAmount) - subtotal;
      const grandTotal = Number(totalAmount);

      let conn;
      try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        let shippingAddressId = shippingAddress?.addressId ?? shippingAddress?.address_id;
        let billingAddressId = billingAddress?.addressId ?? billingAddress?.address_id;

        if (!shippingAddressId && (shippingAddress?.name || shippingAddress?.street)) {
          shippingAddressId = await insertAddress(conn, userId, shippingAddress);
        }
        if (!billingAddressId && (billingAddress?.name || billingAddress?.street)) {
          billingAddressId = await insertAddress(conn, userId, billingAddress);
        }

        const [orderResult] = await conn.execute(
          `INSERT INTO norders
           (order_number, user_id, total_items, total_stores, subtotal, discount, tax, shipping_fee, grand_total,
            payment_method, payment_status, order_status, shipping_address_id, billing_address_id, notes, metadata)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderNumber,
            userId,
            items.length,
            1,
            subtotal,
            0,
            tax,
            0,
            grandTotal,
            paymentMethod ? String(paymentMethod).toUpperCase() : null,
            'PENDING',
            'PENDING',
            shippingAddressId ?? null,
            billingAddressId ?? null,
            null,
            items && items.length ? JSON.stringify({ items, shippingAddress, billingAddress }) : null,
          ]
        );
        const orderId = orderResult.insertId;

        if (Array.isArray(items) && items.length > 0) {
          for (const it of items) {
            const qty = it.quantity ?? it.qty ?? 1;
            const unitPrice = Number(it.price ?? it.unit_price ?? 0);
            const finalPrice = unitPrice * qty;
            await conn.execute(
              `INSERT INTO order_items (order_id, product_name, quantity, unit_price, discount, final_price, item_status)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                orderId,
                it.name ?? it.product_name ?? 'Item',
                qty,
                unitPrice,
                it.discount ?? 0,
                finalPrice,
                'PENDING',
              ]
            );
          }
        }

        await conn.commit();

        const gstPayload = {
          gstNumber: gstNumber || null,
          gstRate: 18,
          cgst: gstDetails.cgst,
          sgst: gstDetails.sgst,
          igst: gstDetails.igst,
          totalGst: gstDetails.gstAmount,
        };

        res.status(201).json({
          success: true,
          message: 'Order created successfully',
          data: {
            orderId: orderNumber,
            order_id: orderId,
            totalAmount: grandTotal,
            gstDetails: gstPayload,
            status: 'pending',
            paymentMethod: paymentMethod || null,
            shippingAddressId: shippingAddressId || undefined,
            billingAddressId: billingAddressId || undefined,
          },
        });
      } catch (err) {
        if (conn) {
          try {
            await conn.rollback();
          } catch (_) {}
          conn.release?.();
        }
        throw err;
      } finally {
        if (conn) conn.release?.();
      }
    } catch (error) {
      console.error('Order creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }
);

// Get order by orderId (order_number string or numeric order_id)
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    let orderRow = null;
    const numeric = Number(orderId);
    if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
      const [rows] = await pool.query(
        'SELECT * FROM norders WHERE order_id = ? LIMIT 1',
        [numeric]
      );
      orderRow = rows?.[0];
    }
    if (!orderRow) {
      const [rows] = await pool.query(
        'SELECT * FROM norders WHERE order_number = ? LIMIT 1',
        [orderId]
      );
      orderRow = rows?.[0];
    }

    if (!orderRow) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const [paymentRows] = await pool.query(
      'SELECT id, status, amount, payment_method FROM payment_info WHERE order_id = ? LIMIT 1',
      [orderRow.order_id]
    );
    const payment = paymentRows?.[0];

    let metadata = null;
    if (orderRow.metadata) {
      try {
        metadata = typeof orderRow.metadata === 'string' ? JSON.parse(orderRow.metadata) : orderRow.metadata;
      } catch (_) {}
    }

    const [itemRows] = await pool.query(
      'SELECT product_name AS name, quantity, unit_price AS price, final_price FROM order_items WHERE order_id = ?',
      [orderRow.order_id]
    );

    const orderPayload = {
      orderId: orderRow.order_number,
      order_id: orderRow.order_id,
      userId: orderRow.user_id,
      items: (itemRows && itemRows.length) ? itemRows : (metadata?.items ?? []),
      pricing: {
        subtotal: Number(orderRow.subtotal),
        gstAmount: Number(orderRow.tax),
        totalAmount: Number(orderRow.grand_total),
      },
      status: (orderRow.order_status || '').toLowerCase(),
      paymentStatus: (orderRow.payment_status || '').toLowerCase(),
      paymentMethod: (orderRow.payment_method || '').toLowerCase(),
      shippingAddress: metadata?.shippingAddress ?? null,
      billingAddress: metadata?.billingAddress ?? null,
      gstDetails: {
        gstRate: 18,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalGst: Number(orderRow.tax),
      },
      createdAt: orderRow.created_at,
      updatedAt: orderRow.updated_at,
    };

    res.json({
      success: true,
      data: {
        order: orderPayload,
        payment: payment
          ? {
              paymentId: payment.id,
              status: payment.status,
              paymentMethod: payment.payment_method,
              amount: Number(payment.amount),
              gstDetails: null,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

// Update order status
router.patch('/:orderId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = [
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'returned',
      'PENDING',
      'CONFIRMED',
      'CANCELLED',
    ];
    const statusVal = String(status).toUpperCase();
    if (!validStatuses.includes(statusVal) && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const [orderRows] = await pool.query(
      'SELECT order_id FROM norders WHERE order_number = ? OR order_id = ? LIMIT 1',
      [req.params.orderId, req.params.orderId]
    );
    const order = orderRows?.[0];
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    await pool.execute(
      'UPDATE norders SET order_status = ? WHERE order_id = ?',
      [statusVal, order.order_id]
    );

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        orderId: req.params.orderId,
        status: statusVal,
      },
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

// Get orders by user
router.get('/user/:userId', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (Math.max(1, Number(page)) - 1) * Math.max(1, Math.min(100, Number(limit)));
    const limitNum = Math.max(1, Math.min(100, Number(limit)));

    const [orders] = await pool.query(
      `SELECT * FROM norders WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [req.params.userId, limitNum, offset]
    );

    const [[{ count }]] = await pool.query(
      'SELECT COUNT(*) AS count FROM norders WHERE user_id = ?',
      [req.params.userId]
    );
    const total = count ?? 0;

    res.json({
      success: true,
      data: {
        orders: (orders || []).map((o) => ({
          orderId: o.order_number,
          order_id: o.order_id,
          userId: o.user_id,
          totalAmount: Number(o.grand_total),
          status: (o.order_status || '').toLowerCase(),
          paymentStatus: (o.payment_status || '').toLowerCase(),
          createdAt: o.created_at,
          updatedAt: o.updated_at,
        })),
        pagination: {
          currentPage: Math.max(1, Number(page)),
          totalPages: Math.ceil(total / limitNum),
          totalOrders: total,
          hasNext: offset + (orders?.length ?? 0) < total,
          hasPrev: Number(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

// Cancel order
router.patch('/:orderId/cancel', async (req, res) => {
  try {
    const { reason } = req.body;

    const [orderRows] = await pool.query(
      'SELECT order_id, order_status, payment_status FROM norders WHERE order_number = ? OR order_id = ? LIMIT 1',
      [req.params.orderId, req.params.orderId]
    );
    const order = orderRows?.[0];
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const statusLower = (order.order_status || '').toLowerCase();
    if (['shipped', 'delivered'].includes(statusLower)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel order that is already shipped or delivered',
      });
    }

    await pool.execute(
      'UPDATE norders SET order_status = ? WHERE order_id = ?',
      ['CANCELLED', order.order_id]
    );

    if ((order.payment_status || '').toUpperCase() === 'PAID') {
      const [payRows] = await pool.query(
        'SELECT id FROM payment_info WHERE order_id = ? LIMIT 1',
        [order.order_id]
      );
      const payment = payRows?.[0];
      if (payment) {
        await pool.execute(
          'UPDATE payment_info SET status = ? WHERE id = ?',
          ['refunded', payment.id]
        );
      }
    }

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        orderId: req.params.orderId,
        status: 'cancelled',
      },
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

module.exports = router;
