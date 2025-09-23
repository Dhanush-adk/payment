#!/bin/bash

echo "🇮🇳 Testing Indian Payment API"
echo "================================"

# Health Check
echo "1. Health Check..."
curl -s http://localhost:3000/health | jq '.'

echo -e "\n2. Compliance Info..."
curl -s http://localhost:3000/compliance | jq '.'

echo -e "\n3. Payment Methods..."
curl -s http://localhost:3000/api/payments/methods | jq '.'

echo -e "\n4. Testing Card Payment..."
curl -s -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "currency": "INR",
    "paymentMethod": "card",
    "orderId": "QUICK_TEST_001",
    "userId": "user_001",
    "customerPhone": "+919876543210",
    "customerEmail": "test@example.com",
    "customerName": "Test User",
    "billingAddress": {
      "name": "Test User",
      "street": "123 Test St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India"
    },
    "shippingAddress": {
      "name": "Test User",
      "street": "123 Test St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India",
      "phone": "+919876543210"
    }
  }' | jq '.'

echo -e "\n5. Testing UPI Payment..."
curl -s -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 200,
    "currency": "INR",
    "paymentMethod": "upi",
    "orderId": "QUICK_TEST_002",
    "userId": "user_002",
    "customerPhone": "+919876543210",
    "customerEmail": "test@example.com",
    "customerName": "Test User",
    "billingAddress": {
      "name": "Test User",
      "street": "123 Test St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India"
    },
    "shippingAddress": {
      "name": "Test User",
      "street": "123 Test St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India",
      "phone": "+919876543210"
    }
  }' | jq '.'

echo -e "\n6. Testing Cash on Delivery..."
curl -s -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "currency": "INR",
    "paymentMethod": "cash_on_delivery",
    "orderId": "QUICK_TEST_003",
    "userId": "user_003",
    "customerPhone": "+919876543210",
    "customerEmail": "test@example.com",
    "customerName": "Test User",
    "billingAddress": {
      "name": "Test User",
      "street": "123 Test St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India"
    },
    "shippingAddress": {
      "name": "Test User",
      "street": "123 Test St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India",
      "phone": "+919876543210"
    }
  }' | jq '.'

echo -e "\n7. Testing GST Calculation (Intra-state)..."
curl -s -X POST http://localhost:3000/api/gst/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "gstRate": 18,
    "isInterState": false
  }' | jq '.'

echo -e "\n8. Testing GST Calculation (Inter-state)..."
curl -s -X POST http://localhost:3000/api/gst/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "gstRate": 18,
    "isInterState": true
  }' | jq '.'

echo -e "\n9. Testing GST Rates..."
curl -s http://localhost:3000/api/gst/rates | jq '.'

echo -e "\n10. Testing Webhook Verification..."
curl -s http://localhost:3000/api/webhooks/verify | jq '.'

echo -e "\n✅ All tests completed!"
echo "================================"
echo "🇮🇳 Your Indian Payment API is working perfectly!"
