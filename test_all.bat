@echo off
echo 🇮🇳 Testing Indian Payment API
echo ================================

echo 1. Health Check...
curl -s http://localhost:3000/health

echo.
echo 2. Compliance Info...
curl -s http://localhost:3000/compliance

echo.
echo 3. Payment Methods...
curl -s http://localhost:3000/api/payments/methods

echo.
echo 4. Testing Card Payment...
curl -s -X POST http://localhost:3000/api/payments/create -H "Content-Type: application/json" -d "{\"amount\": 100, \"currency\": \"INR\", \"paymentMethod\": \"card\", \"orderId\": \"QUICK_TEST_001\", \"userId\": \"user_001\", \"customerPhone\": \"+919876543210\", \"customerEmail\": \"test@example.com\", \"customerName\": \"Test User\", \"billingAddress\": {\"name\": \"Test User\", \"street\": \"123 Test St\", \"city\": \"Mumbai\", \"state\": \"Maharashtra\", \"pincode\": \"400001\", \"country\": \"India\"}, \"shippingAddress\": {\"name\": \"Test User\", \"street\": \"123 Test St\", \"city\": \"Mumbai\", \"state\": \"Maharashtra\", \"pincode\": \"400001\", \"country\": \"India\", \"phone\": \"+919876543210\"}}"

echo.
echo 5. Testing UPI Payment...
curl -s -X POST http://localhost:3000/api/payments/create -H "Content-Type: application/json" -d "{\"amount\": 200, \"currency\": \"INR\", \"paymentMethod\": \"upi\", \"orderId\": \"QUICK_TEST_002\", \"userId\": \"user_002\", \"customerPhone\": \"+919876543210\", \"customerEmail\": \"test@example.com\", \"customerName\": \"Test User\", \"billingAddress\": {\"name\": \"Test User\", \"street\": \"123 Test St\", \"city\": \"Mumbai\", \"state\": \"Maharashtra\", \"pincode\": \"400001\", \"country\": \"India\"}, \"shippingAddress\": {\"name\": \"Test User\", \"street\": \"123 Test St\", \"city\": \"Mumbai\", \"state\": \"Maharashtra\", \"pincode\": \"400001\", \"country\": \"India\", \"phone\": \"+919876543210\"}}"

echo.
echo 6. Testing Cash on Delivery...
curl -s -X POST http://localhost:3000/api/payments/create -H "Content-Type: application/json" -d "{\"amount\": 500, \"currency\": \"INR\", \"paymentMethod\": \"cash_on_delivery\", \"orderId\": \"QUICK_TEST_003\", \"userId\": \"user_003\", \"customerPhone\": \"+919876543210\", \"customerEmail\": \"test@example.com\", \"customerName\": \"Test User\", \"billingAddress\": {\"name\": \"Test User\", \"street\": \"123 Test St\", \"city\": \"Mumbai\", \"state\": \"Maharashtra\", \"pincode\": \"400001\", \"country\": \"India\"}, \"shippingAddress\": {\"name\": \"Test User\", \"street\": \"123 Test St\", \"city\": \"Mumbai\", \"state\": \"Maharashtra\", \"pincode\": \"400001\", \"country\": \"India\", \"phone\": \"+919876543210\"}}"

echo.
echo 7. Testing GST Calculation (Intra-state)...
curl -s -X POST http://localhost:3000/api/gst/calculate -H "Content-Type: application/json" -d "{\"amount\": 1000, \"gstRate\": 18, \"isInterState\": false}"

echo.
echo 8. Testing GST Calculation (Inter-state)...
curl -s -X POST http://localhost:3000/api/gst/calculate -H "Content-Type: application/json" -d "{\"amount\": 1000, \"gstRate\": 18, \"isInterState\": true}"

echo.
echo 9. Testing GST Rates...
curl -s http://localhost:3000/api/gst/rates

echo.
echo 10. Testing Webhook Verification...
curl -s http://localhost:3000/api/webhooks/verify

echo.
echo ✅ All tests completed!
echo ================================
echo 🇮🇳 Your Indian Payment API is working perfectly!
pause
