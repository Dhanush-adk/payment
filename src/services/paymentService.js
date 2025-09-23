const Razorpay = require('razorpay');
const crypto = require('crypto');
const axios = require('axios');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

class IndianPaymentService {
  // UPI Payment using Razorpay
  async createUPIPayment(amount, currency, orderId, metadata) {
    try {
      const options = {
        amount: Math.round(amount * 100), // Convert to paise
        currency: currency,
        receipt: orderId,
        notes: {
          ...metadata,
          payment_method: 'upi',
          country: 'IN'
        },
        payment_capture: 1
      };

      const order = await razorpay.orders.create(options);
      
      return {
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
        upiApps: process.env.UPI_APP_SCHEMES?.split(',') || ['phonepe', 'paytm', 'googlepay', 'bhim']
      };
    } catch (error) {
      console.error('Razorpay UPI order creation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Card Payment using Razorpay
  async createCardPayment(amount, currency, orderId, metadata) {
    try {
      const options = {
        amount: Math.round(amount * 100),
        currency: currency,
        receipt: orderId,
        notes: {
          ...metadata,
          payment_method: 'card',
          country: 'IN'
        },
        payment_capture: 1
      };

      const order = await razorpay.orders.create(options);
      
      return {
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID
      };
    } catch (error) {
      console.error('Razorpay card order creation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Net Banking using Razorpay
  async createNetBankingPayment(amount, currency, orderId, metadata) {
    try {
      const options = {
        amount: Math.round(amount * 100),
        currency: currency,
        receipt: orderId,
        notes: {
          ...metadata,
          payment_method: 'netbanking',
          country: 'IN'
        },
        payment_capture: 1
      };

      const order = await razorpay.orders.create(options);
      
      return {
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID
      };
    } catch (error) {
      console.error('Razorpay netbanking order creation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Wallet Payment using Razorpay
  async createWalletPayment(amount, currency, orderId, metadata) {
    try {
      const options = {
        amount: Math.round(amount * 100),
        currency: currency,
        receipt: orderId,
        notes: {
          ...metadata,
          payment_method: 'wallet',
          country: 'IN'
        },
        payment_capture: 1
      };

      const order = await razorpay.orders.create(options);
      
      return {
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID
      };
    } catch (error) {
      console.error('Razorpay wallet order creation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Cash on Delivery
  async createCashOnDeliveryPayment(amount, currency, orderId, metadata) {
    return {
      success: true,
      paymentMethod: 'cash_on_delivery',
      message: 'Order created for cash on delivery',
      orderId: orderId,
      amount: amount,
      currency: currency
    };
  }

  // Verify Razorpay Payment
  async verifyRazorpayPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (expectedSignature === razorpaySignature) {
        // Fetch payment details from Razorpay
        const payment = await razorpay.payments.fetch(razorpayPaymentId);
        return { 
          success: true, 
          verified: true,
          paymentDetails: payment
        };
      } else {
        return { 
          success: false, 
          verified: false, 
          error: 'Invalid signature' 
        };
      }
    } catch (error) {
      console.error('Razorpay payment verification failed:', error);
      return {
        success: false,
        verified: false,
        error: error.message
      };
    }
  }

  // Refund payment
  async refundPayment(paymentId, amount, reason, paymentProvider = 'razorpay') {
    try {
      if (paymentProvider === 'razorpay') {
        const refund = await razorpay.payments.refund(paymentId, {
          amount: Math.round(amount * 100),
          notes: {
            reason: reason || 'requested_by_customer'
          }
        });
        return { success: true, refundId: refund.id };
      }
      
      // Add other payment provider refunds here
      return { success: false, error: 'Refund not supported for this payment provider' };
    } catch (error) {
      console.error('Refund failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Get supported payment methods for India
  getSupportedPaymentMethods() {
    return {
      upi: {
        name: 'UPI',
        providers: ['razorpay'],
        apps: ['PhonePe', 'Paytm', 'Google Pay', 'BHIM', 'Amazon Pay'],
        description: 'Unified Payments Interface'
      },
      card: {
        name: 'Cards',
        providers: ['razorpay'],
        types: ['Credit Card', 'Debit Card'],
        description: 'Credit and Debit Cards'
      },
      netbanking: {
        name: 'Net Banking',
        providers: ['razorpay'],
        banks: ['SBI', 'HDFC', 'ICICI', 'Axis', 'Kotak', 'PNB'],
        description: 'Internet Banking'
      },
      wallet: {
        name: 'Wallets',
        providers: ['razorpay'],
        wallets: ['Paytm', 'PhonePe', 'Mobikwik', 'Freecharge'],
        description: 'Digital Wallets'
      },
      cash_on_delivery: {
        name: 'Cash on Delivery',
        providers: ['cod'],
        description: 'Pay when you receive'
      }
    };
  }
}

module.exports = new IndianPaymentService();
