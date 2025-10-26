const { connectDB, sequelize } = require('./src/config/database');
const Payment = require('./src/models/PaymentMySQL');

const testPaymentMigration = async () => {
  try {
    console.log('🧪 Testing Payment Migration to MySQL...');
    
    // Connect to databases
    await connectDB();
    
    // Test creating a payment record
    const testPayment = await Payment.create({
      orderId: 'TEST_ORDER_' + Date.now(),
      userId: 'test_user_123',
      amount: 100.00,
      currency: 'INR',
      paymentMethod: 'upi',
      paymentProvider: 'razorpay',
      status: 'pending',
      razorpayOrderId: 'test_razorpay_order_123',
      customerEmail: 'test@example.com',
      customerPhone: '9876543210',
      customerName: 'Test User',
      billingName: 'Test User',
      billingStreet: '123 Test Street',
      billingCity: 'Mumbai',
      billingState: 'Maharashtra',
      billingPincode: '400001',
      billingCountry: 'India',
      gstNumber: '27AABCU9603R1ZX',
      gstRate: 18
    });
    
    console.log('✅ Payment created successfully:', {
      id: testPayment.id,
      orderId: testPayment.orderId,
      amount: testPayment.amount,
      status: testPayment.status,
      gstDetails: {
        gstRate: testPayment.gstRate,
        totalGst: testPayment.totalGst,
        taxableAmount: testPayment.taxableAmount
      }
    });
    
    // Test updating payment status
    await testPayment.update({
      status: 'completed',
      razorpayPaymentId: 'test_payment_123',
      razorpaySignature: 'test_signature_123'
    });
    
    console.log('✅ Payment updated successfully:', {
      id: testPayment.id,
      status: testPayment.status,
      razorpayPaymentId: testPayment.razorpayPaymentId
    });
    
    // Test finding payment
    const foundPayment = await Payment.findByPk(testPayment.id);
    console.log('✅ Payment found successfully:', {
      id: foundPayment.id,
      orderId: foundPayment.orderId,
      status: foundPayment.status
    });
    
    // Test finding by orderId
    const paymentByOrderId = await Payment.findOne({ where: { orderId: testPayment.orderId } });
    console.log('✅ Payment found by orderId:', {
      id: paymentByOrderId.id,
      orderId: paymentByOrderId.orderId
    });
    
    // Clean up test data
    await testPayment.destroy();
    console.log('✅ Test payment cleaned up');
    
    console.log('🎉 Payment migration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Payment migration test failed:', error);
  } finally {
    // Close connections
    if (sequelize) {
      await sequelize.close();
    }
    process.exit(0);
  }
};

// Run test if this file is executed directly
if (require.main === module) {
  testPaymentMigration();
}

module.exports = testPaymentMigration;
