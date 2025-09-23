# 🇮🇳 Indian Payment API - Test Cases

Complete collection of curl commands to test all payment methods and features.

## 🚀 Quick Setup

### Prerequisites
- Server running on `http://localhost:3000`
- MongoDB connected
- Razorpay test keys configured

### Health Check
```bash
curl http://localhost:3000/health
```

### Compliance Info
```bash
curl http://localhost:3000/compliance
```

---

## 💳 Payment Methods Testing

### 1. Get Available Payment Methods
```bash
curl http://localhost:3000/api/payments/methods
```

---

## 🧪 Payment Creation Tests

### 2. Card Payment (Credit/Debit)
```bash
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "currency": "INR",
    "paymentMethod": "card",
    "orderId": "CARD_TEST_001",
    "userId": "user_001",
    "customerPhone": "+919876543210",
    "customerEmail": "test@example.com",
    "customerName": "John Doe",
    "billingAddress": {
      "name": "John Doe",
      "street": "123 Main Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India"
    },
    "shippingAddress": {
      "name": "John Doe",
      "street": "123 Main Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India",
      "phone": "+919876543210"
    }
  }'
```

### 3. UPI Payment
```bash
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "currency": "INR",
    "paymentMethod": "upi",
    "orderId": "UPI_TEST_002",
    "userId": "user_002",
    "customerPhone": "+919876543210",
    "customerEmail": "test@example.com",
    "customerName": "Jane Smith",
    "billingAddress": {
      "name": "Jane Smith",
      "street": "456 Park Avenue",
      "city": "Delhi",
      "state": "Delhi",
      "pincode": "110001",
      "country": "India"
    },
    "shippingAddress": {
      "name": "Jane Smith",
      "street": "456 Park Avenue",
      "city": "Delhi",
      "state": "Delhi",
      "pincode": "110001",
      "country": "India",
      "phone": "+919876543210"
    }
  }'
```

### 4. Net Banking Payment
```bash
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2000,
    "currency": "INR",
    "paymentMethod": "netbanking",
    "orderId": "NETBANK_TEST_003",
    "userId": "user_003",
    "customerPhone": "+919876543210",
    "customerEmail": "test@example.com",
    "customerName": "Raj Kumar",
    "billingAddress": {
      "name": "Raj Kumar",
      "street": "789 Business District",
      "city": "Bangalore",
      "state": "Karnataka",
      "pincode": "560001",
      "country": "India"
    },
    "shippingAddress": {
      "name": "Raj Kumar",
      "street": "789 Business District",
      "city": "Bangalore",
      "state": "Karnataka",
      "pincode": "560001",
      "country": "India",
      "phone": "+919876543210"
    }
  }'
```

### 5. Wallet Payment
```bash
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 750,
    "currency": "INR",
    "paymentMethod": "wallet",
    "orderId": "WALLET_TEST_004",
    "userId": "user_004",
    "customerPhone": "+919876543210",
    "customerEmail": "test@example.com",
    "customerName": "Priya Sharma",
    "billingAddress": {
      "name": "Priya Sharma",
      "street": "321 Tech Park",
      "city": "Pune",
      "state": "Maharashtra",
      "pincode": "411001",
      "country": "India"
    },
    "shippingAddress": {
      "name": "Priya Sharma",
      "street": "321 Tech Park",
      "city": "Pune",
      "state": "Maharashtra",
      "pincode": "411001",
      "country": "India",
      "phone": "+919876543210"
    }
  }'
```

### 6. Cash on Delivery
```bash
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1500,
    "currency": "INR",
    "paymentMethod": "cash_on_delivery",
    "orderId": "COD_TEST_005",
    "userId": "user_005",
    "customerPhone": "+919876543210",
    "customerEmail": "test@example.com",
    "customerName": "Amit Patel",
    "billingAddress": {
      "name": "Amit Patel",
      "street": "654 Residential Area",
      "city": "Ahmedabad",
      "state": "Gujarat",
      "pincode": "380001",
      "country": "India"
    },
    "shippingAddress": {
      "name": "Amit Patel",
      "street": "654 Residential Area",
      "city": "Ahmedabad",
      "state": "Gujarat",
      "pincode": "380001",
      "country": "India",
      "phone": "+919876543210"
    }
  }'
```

---

## 🏛️ GST Testing

### 7. GST Calculation - Intra-state (Same State)
```bash
curl -X POST http://localhost:3000/api/gst/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "gstRate": 18,
    "isInterState": false
  }'
```

### 8. GST Calculation - Inter-state (Different States)
```bash
curl -X POST http://localhost:3000/api/gst/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "gstRate": 18,
    "isInterState": true
  }'
```

### 9. GST Calculation - Different Rates
```bash
# 5% GST
curl -X POST http://localhost:3000/api/gst/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "gstRate": 5,
    "isInterState": false
  }'

# 12% GST
curl -X POST http://localhost:3000/api/gst/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "gstRate": 12,
    "isInterState": false
  }'

# 28% GST
curl -X POST http://localhost:3000/api/gst/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "gstRate": 28,
    "isInterState": false
  }'
```

### 10. Get GST Rates
```bash
curl http://localhost:3000/api/gst/rates
```

### 11. Validate GST Number
```bash
curl -X POST http://localhost:3000/api/gst/validate \
  -H "Content-Type: application/json" \
  -d '{
    "gstNumber": "27AAPFU0939F1ZV"
  }'
```

---

## 📋 Order Management

### 12. Create Order
```bash
curl -X POST http://localhost:3000/api/orders/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_006",
    "items": [
      {
        "productId": "PROD_001",
        "name": "Laptop",
        "quantity": 1,
        "price": 50000,
        "hsnCode": "8471",
        "gstRate": 18
      },
      {
        "productId": "PROD_002",
        "name": "Mouse",
        "quantity": 2,
        "price": 500,
        "hsnCode": "8471",
        "gstRate": 18
      }
    ],
    "totalAmount": 51000,
    "shippingAddress": {
      "name": "Test User",
      "street": "123 Test Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India",
      "phone": "+919876543210"
    },
    "billingAddress": {
      "name": "Test User",
      "street": "123 Test Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India",
      "phone": "+919876543210"
    },
    "paymentMethod": "card"
  }'
```

### 13. Get Order Details
```bash
# Replace ORDER_ID with actual order ID from previous response
curl http://localhost:3000/api/orders/ORD_1234567890_abc123def
```

### 14. Update Order Status
```bash
curl -X PATCH http://localhost:3000/api/orders/ORD_1234567890_abc123def/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed"
  }'
```

### 15. Get User Orders
```bash
curl http://localhost:3000/api/orders/user/user_006?page=1&limit=10
```

### 16. Cancel Order
```bash
curl -X PATCH http://localhost:3000/api/orders/ORD_1234567890_abc123def/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Customer requested cancellation"
  }'
```

---

## 💰 Payment Management

### 17. Get Payment Status
```bash
# Replace PAYMENT_ID with actual payment ID from create response
curl http://localhost:3000/api/payments/status/68d2c136e01d30158e67e9d9
```

### 18. Confirm Payment
```bash
curl -X POST http://localhost:3000/api/payments/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "68d2c136e01d30158e67e9d9",
    "paymentMethod": "card",
    "paymentData": {
      "razorpayOrderId": "order_RL68PIo9jCXCnC",
      "razorpayPaymentId": "pay_RL68PIo9jCXCnC",
      "razorpaySignature": "signature_here"
    }
  }'
```

### 19. Refund Payment
```bash
curl -X POST http://localhost:3000/api/payments/refund \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "68d2c136e01d30158e67e9d9",
    "amount": 100,
    "reason": "Customer requested refund"
  }'
```

---

## 🔗 Webhook Testing

### 20. Verify Webhook Endpoint
```bash
curl http://localhost:3000/api/webhooks/verify
```

### 21. Test Razorpay Webhook
```bash
curl -X POST http://localhost:3000/api/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -d '{
    "event": "payment.captured",
    "payload": {
      "payment": {
        "entity": {
          "id": "pay_RL68PIo9jCXCnC",
          "order_id": "order_RL68PIo9jCXCnC",
          "method": "card",
          "status": "captured",
          "amount": 100000
        }
      }
    }
  }'
```

---

## 🧪 Error Testing

### 22. Invalid Payment Method
```bash
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "currency": "INR",
    "paymentMethod": "invalid_method",
    "orderId": "ERROR_TEST_001",
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
  }'
```

### 23. Invalid Currency
```bash
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "currency": "USD",
    "paymentMethod": "card",
    "orderId": "ERROR_TEST_002",
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
  }'
```

### 24. Missing Required Fields
```bash
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "currency": "INR",
    "paymentMethod": "card"
  }'
```

---

## 📊 Expected Responses

### Successful Payment Creation
```json
{
  "success": true,
  "message": "Payment created successfully",
  "data": {
    "paymentId": "68d2c136e01d30158e67e9d9",
    "orderId": "CARD_TEST_001",
    "amount": 1000,
    "currency": "INR",
    "paymentMethod": "card",
    "status": "pending",
    "gstDetails": {
      "gstNumber": null,
      "gstRate": 18,
      "cgst": 0,
      "sgst": 0,
      "igst": 152.54,
      "taxableAmount": 847.46,
      "totalGst": 152.54
    },
    "razorpayOrderId": "order_RL68PIo9jCXCnC",
    "key": "rzp_test_RL5zUngW1AsGqK"
  }
}
```

### Successful GST Calculation
```json
{
  "success": true,
  "data": {
    "taxableAmount": 847.46,
    "gstAmount": 152.54,
    "cgst": 76.27,
    "sgst": 76.27,
    "igst": 0,
    "totalAmount": 1000
  },
  "country": "India",
  "currency": "INR"
}
```

---

## 🚀 Quick Test Script

Save this as `test_all.sh` and run `chmod +x test_all.sh && ./test_all.sh`:

```bash
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

echo -e "\n5. Testing GST Calculation..."
curl -s -X POST http://localhost:3000/api/gst/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "gstRate": 18,
    "isInterState": false
  }' | jq '.'

echo -e "\n✅ All tests completed!"
```

---

## 📝 Notes

- Replace `PAYMENT_ID` and `ORDER_ID` with actual IDs from responses
- All amounts are in paise (multiply by 100 for rupees)
- GST is automatically calculated based on billing/shipping state
- Test with different amounts and states to see GST variations
- Use `jq` for pretty JSON formatting: `curl ... | jq '.'`

---

**Happy Testing! 🇮🇳💳**
