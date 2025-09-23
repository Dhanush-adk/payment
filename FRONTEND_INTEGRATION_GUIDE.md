# 📱 Frontend Integration Guide - Indian Payment API

Complete guide for integrating the payment API with your mobile and web applications.

## 🎯 **What Happens After Payment Creation?**

When you call `/api/payments/create`, you get:
```json
{
  "success": true,
  "data": {
    "paymentId": "68d2c136e01d30158e67e9d9",
    "razorpayOrderId": "order_RL68PIo9jCXCnC",
    "key": "rzp_test_RL5zUngW1AsGqK",
    "amount": 100,
    "status": "pending"
  }
}
```

**Next Steps:**
1. ✅ Payment created (DONE)
2. 🔄 Show payment form to customer
3. 💳 Customer completes payment
4. ✅ Confirm payment with your backend

---

## 🌐 **Web Integration (HTML/JavaScript)**

### **Step 1: Include Razorpay Script**
```html
<!DOCTYPE html>
<html>
<head>
    <title>Payment Test</title>
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body>
    <button onclick="createPayment()">Pay ₹100</button>
    
    <script>
        async function createPayment() {
            try {
                // Step 1: Create payment with your API
                const response = await fetch('http://localhost:3000/api/payments/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        amount: 100,
                        currency: 'INR',
                        paymentMethod: 'card',
                        orderId: 'WEB_TEST_' + Date.now(),
                        userId: 'user_001',
                        customerPhone: '+919876543210',
                        customerEmail: 'test@example.com',
                        customerName: 'Test User',
                        billingAddress: {
                            name: 'Test User',
                            street: '123 Test St',
                            city: 'Mumbai',
                            state: 'Maharashtra',
                            pincode: '400001',
                            country: 'India'
                        },
                        shippingAddress: {
                            name: 'Test User',
                            street: '123 Test St',
                            city: 'Mumbai',
                            state: 'Maharashtra',
                            pincode: '400001',
                            country: 'India',
                            phone: '+919876543210'
                        }
                    })
                });
                
                const paymentData = await response.json();
                
                if (paymentData.success) {
                    // Step 2: Open Razorpay checkout
                    openRazorpayCheckout(paymentData.data);
                } else {
                    alert('Payment creation failed: ' + paymentData.message);
                }
                
            } catch (error) {
                console.error('Error:', error);
                alert('Something went wrong!');
            }
        }
        
        function openRazorpayCheckout(data) {
            const options = {
                key: data.key, // Your Razorpay key
                amount: data.amount * 100, // Convert to paise
                currency: data.currency,
                name: 'Your Company',
                description: 'Test Payment',
                order_id: data.razorpayOrderId,
                handler: function (response) {
                    // Step 3: Payment successful - confirm with backend
                    confirmPayment(data.paymentId, response);
                },
                prefill: {
                    name: 'Test User',
                    email: 'test@example.com',
                    contact: '+919876543210'
                },
                theme: {
                    color: '#3399cc'
                },
                modal: {
                    ondismiss: function() {
                        alert('Payment cancelled');
                    }
                }
            };
            
            const rzp = new Razorpay(options);
            rzp.open();
        }
        
        async function confirmPayment(paymentId, razorpayResponse) {
            try {
                const response = await fetch('http://localhost:3000/api/payments/confirm', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        paymentId: paymentId,
                        paymentMethod: 'card',
                        paymentData: {
                            razorpayOrderId: razorpayResponse.razorpay_order_id,
                            razorpayPaymentId: razorpayResponse.razorpay_payment_id,
                            razorpaySignature: razorpayResponse.razorpay_signature
                        }
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('Payment successful! Order confirmed.');
                    // Redirect to success page or show success message
                } else {
                    alert('Payment confirmation failed: ' + result.message);
                }
                
            } catch (error) {
                console.error('Confirmation error:', error);
                alert('Payment confirmation failed!');
            }
        }
    </script>
</body>
</html>
```

---

## 📱 **React Integration**

### **Step 1: Install Razorpay**
```bash
npm install razorpay
```

### **Step 2: Create Payment Component**
```jsx
import React, { useState } from 'react';
import Razorpay from 'razorpay';

const PaymentComponent = () => {
    const [loading, setLoading] = useState(false);
    
    const createPayment = async () => {
        setLoading(true);
        
        try {
            // Step 1: Create payment
            const response = await fetch('http://localhost:3000/api/payments/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: 100,
                    currency: 'INR',
                    paymentMethod: 'card',
                    orderId: 'REACT_TEST_' + Date.now(),
                    userId: 'user_001',
                    customerPhone: '+919876543210',
                    customerEmail: 'test@example.com',
                    customerName: 'Test User',
                    billingAddress: {
                        name: 'Test User',
                        street: '123 Test St',
                        city: 'Mumbai',
                        state: 'Maharashtra',
                        pincode: '400001',
                        country: 'India'
                    },
                    shippingAddress: {
                        name: 'Test User',
                        street: '123 Test St',
                        city: 'Mumbai',
                        state: 'Maharashtra',
                        pincode: '400001',
                        country: 'India',
                        phone: '+919876543210'
                    }
                })
            });
            
            const paymentData = await response.json();
            
            if (paymentData.success) {
                // Step 2: Open Razorpay
                openRazorpay(paymentData.data);
            } else {
                alert('Payment creation failed');
            }
            
        } catch (error) {
            console.error('Error:', error);
            alert('Something went wrong!');
        } finally {
            setLoading(false);
        }
    };
    
    const openRazorpay = (data) => {
        const options = {
            key: data.key,
            amount: data.amount * 100,
            currency: data.currency,
            name: 'Your Company',
            description: 'Test Payment',
            order_id: data.razorpayOrderId,
            handler: async (response) => {
                // Step 3: Confirm payment
                await confirmPayment(data.paymentId, response);
            },
            prefill: {
                name: 'Test User',
                email: 'test@example.com',
                contact: '+919876543210'
            },
            theme: {
                color: '#3399cc'
            }
        };
        
        const rzp = new Razorpay(options);
        rzp.open();
    };
    
    const confirmPayment = async (paymentId, razorpayResponse) => {
        try {
            const response = await fetch('http://localhost:3000/api/payments/confirm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    paymentId: paymentId,
                    paymentMethod: 'card',
                    paymentData: {
                        razorpayOrderId: razorpayResponse.razorpay_order_id,
                        razorpayPaymentId: razorpayResponse.razorpay_payment_id,
                        razorpaySignature: razorpayResponse.razorpay_signature
                    }
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('Payment successful!');
                // Handle success (redirect, show message, etc.)
            } else {
                alert('Payment confirmation failed');
            }
            
        } catch (error) {
            console.error('Confirmation error:', error);
            alert('Payment confirmation failed!');
        }
    };
    
    return (
        <div>
            <h2>Payment Test</h2>
            <button 
                onClick={createPayment} 
                disabled={loading}
            >
                {loading ? 'Processing...' : 'Pay ₹100'}
            </button>
        </div>
    );
};

export default PaymentComponent;
```

---

## 📱 **Mobile App Integration (React Native)**

### **Step 1: Install Dependencies**
```bash
npm install react-native-razorpay
```

### **Step 2: Payment Component**
```jsx
import React, { useState } from 'react';
import { View, Button, Alert } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';

const PaymentScreen = () => {
    const [loading, setLoading] = useState(false);
    
    const createPayment = async () => {
        setLoading(true);
        
        try {
            // Step 1: Create payment
            const response = await fetch('http://localhost:3000/api/payments/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: 100,
                    currency: 'INR',
                    paymentMethod: 'card',
                    orderId: 'MOBILE_TEST_' + Date.now(),
                    userId: 'user_001',
                    customerPhone: '+919876543210',
                    customerEmail: 'test@example.com',
                    customerName: 'Test User',
                    billingAddress: {
                        name: 'Test User',
                        street: '123 Test St',
                        city: 'Mumbai',
                        state: 'Maharashtra',
                        pincode: '400001',
                        country: 'India'
                    },
                    shippingAddress: {
                        name: 'Test User',
                        street: '123 Test St',
                        city: 'Mumbai',
                        state: 'Maharashtra',
                        pincode: '400001',
                        country: 'India',
                        phone: '+919876543210'
                    }
                })
            });
            
            const paymentData = await response.json();
            
            if (paymentData.success) {
                // Step 2: Open Razorpay
                openRazorpay(paymentData.data);
            } else {
                Alert.alert('Error', 'Payment creation failed');
            }
            
        } catch (error) {
            console.error('Error:', error);
            Alert.alert('Error', 'Something went wrong!');
        } finally {
            setLoading(false);
        }
    };
    
    const openRazorpay = (data) => {
        const options = {
            description: 'Test Payment',
            image: 'https://your-logo-url.com/logo.png',
            currency: data.currency,
            key: data.key,
            amount: data.amount * 100,
            order_id: data.razorpayOrderId,
            name: 'Your Company',
            prefill: {
                email: 'test@example.com',
                contact: '+919876543210',
                name: 'Test User'
            },
            theme: { color: '#3399cc' }
        };
        
        RazorpayCheckout.open(options)
            .then(async (response) => {
                // Step 3: Confirm payment
                await confirmPayment(data.paymentId, response);
            })
            .catch((error) => {
                Alert.alert('Error', 'Payment failed or cancelled');
            });
    };
    
    const confirmPayment = async (paymentId, razorpayResponse) => {
        try {
            const response = await fetch('http://localhost:3000/api/payments/confirm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    paymentId: paymentId,
                    paymentMethod: 'card',
                    paymentData: {
                        razorpayOrderId: razorpayResponse.razorpay_order_id,
                        razorpayPaymentId: razorpayResponse.razorpay_payment_id,
                        razorpaySignature: razorpayResponse.razorpay_signature
                    }
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                Alert.alert('Success', 'Payment successful!');
                // Handle success
            } else {
                Alert.alert('Error', 'Payment confirmation failed');
            }
            
        } catch (error) {
            console.error('Confirmation error:', error);
            Alert.alert('Error', 'Payment confirmation failed!');
        }
    };
    
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Button
                title={loading ? 'Processing...' : 'Pay ₹100'}
                onPress={createPayment}
                disabled={loading}
            />
        </View>
    );
};

export default PaymentScreen;
```

---

## 🔄 **Complete Payment Flow**

### **What Happens Step by Step:**

1. **User clicks "Pay" button** → Your app calls `/api/payments/create`
2. **Payment created** → You get `razorpayOrderId` and `key`
3. **Razorpay checkout opens** → Customer sees payment form
4. **Customer pays** → Razorpay processes the payment
5. **Payment successful** → Razorpay returns payment details
6. **Confirm payment** → Your app calls `/api/payments/confirm`
7. **Payment confirmed** → Order status updated to "paid"

### **Test Cards for Development:**
```
Visa: 4111111111111111
Mastercard: 5555555555554444
Expiry: Any future date (e.g., 12/25)
CVV: Any 3 digits (e.g., 123)
```

---

## 🧪 **Testing Your Integration**

### **Step 1: Test Payment Creation**
```bash
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "currency": "INR",
    "paymentMethod": "card",
    "orderId": "TEST_001",
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

### **Step 2: Use the Response**
Copy the `razorpayOrderId` and `key` from the response and use them in your frontend code.

### **Step 3: Test Payment Confirmation**
After successful payment, test the confirmation:
```bash
curl -X POST http://localhost:3000/api/payments/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "YOUR_PAYMENT_ID",
    "paymentMethod": "card",
    "paymentData": {
      "razorpayOrderId": "YOUR_RAZORPAY_ORDER_ID",
      "razorpayPaymentId": "YOUR_RAZORPAY_PAYMENT_ID",
      "razorpaySignature": "YOUR_RAZORPAY_SIGNATURE"
    }
  }'
```

---

## 🎯 **Key Points to Remember:**

1. **Payment Creation** → Always call your API first
2. **Razorpay Checkout** → Use the `razorpayOrderId` and `key` from your API
3. **Payment Confirmation** → Always confirm with your backend after successful payment
4. **Error Handling** → Handle all possible error scenarios
5. **Test Mode** → Use test cards and test keys for development

---

## 🚀 **Quick Start:**

1. **Copy the HTML example** above
2. **Save as `payment-test.html`**
3. **Open in browser**
4. **Click "Pay ₹100"**
5. **Use test card: 4111111111111111**
6. **See the complete flow in action!**

**That's it! Your payment integration is ready! 🎉**
