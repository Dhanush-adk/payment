# 🇮🇳 Indian Payment Backend API

A comprehensive payment processing API specifically designed for India, supporting UPI, cards, net banking, wallets, and cash on delivery with full GST compliance.

## ✨ Features

- 💳 **Multiple Payment Methods** - UPI, Cards, Net Banking, Wallets, Cash on Delivery
- 🏛️ **GST Compliance** - Automatic GST calculation with CGST/SGST/IGST
- 🔒 **Security** - RBI compliant, PCI DSS standards, rate limiting
- 📱 **UPI Integration** - Support for all major UPI apps (PhonePe, Paytm, Google Pay, BHIM, Amazon Pay)
- 🏦 **Indian Banks** - Support for all major Indian banks
- 📊 **Real-time Updates** - Webhook support for payment confirmations
- 🗄️ **Data Retention** - 7-year data retention as per Indian regulations
- 🚀 **Production Ready** - Comprehensive error handling, logging, monitoring

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Razorpay account
- Indian mobile number for testing

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp env.example .env
# Edit .env with your actual values
```

3. **Start MongoDB:**
```bash
# Using MongoDB service
sudo systemctl start mongod

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

4. **Run the application:**
```bash
# Development
npm run dev

# Production
npm start
```

## 🔧 Configuration

### Environment Variables

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/payment-api-india

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

# Indian Payment Configuration
CURRENCY=INR
COUNTRY=IN
GST_RATE=18
SUCCESS_URL=http://localhost:3000/payment/success
CANCEL_URL=http://localhost:3000/payment/cancel
FAILURE_URL=http://localhost:3000/payment/failure

# UPI Configuration
UPI_APP_SCHEMES=phonepe,paytm,googlepay,bhim,amazonpay
```

### Razorpay Setup

1. Create account at [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Get API keys from Settings > API Keys
3. Set up webhook endpoint: `https://yourdomain.com/api/webhooks/razorpay`
4. Configure webhook events: `payment.captured`, `payment.failed`, `order.paid`

## 📚 API Endpoints

### Health & Compliance

- `GET /health` - Health check
- `GET /compliance` - Indian compliance information

### Payments

- `GET /api/payments/methods` - Get supported payment methods
- `POST /api/payments/create` - Create a new payment
- `POST /api/payments/confirm` - Confirm payment
- `GET /api/payments/status/:paymentId` - Get payment status
- `POST /api/payments/refund` - Refund payment

### Orders

- `POST /api/orders/create` - Create a new order
- `GET /api/orders/:orderId` - Get order details
- `PATCH /api/orders/:orderId/status` - Update order status
- `GET /api/orders/user/:userId` - Get user orders
- `PATCH /api/orders/:orderId/cancel` - Cancel order

### GST

- `POST /api/gst/calculate` - Calculate GST
- `GET /api/gst/rates` - Get GST rates
- `POST /api/gst/validate` - Validate GST number

### Webhooks

- `POST /api/webhooks/razorpay` - Razorpay webhook
- `POST /api/webhooks/generic` - Generic webhook handler
- `GET /api/webhooks/verify` - Verify webhook endpoint

## 💡 Usage Examples

### 1. Create UPI Payment

```bash
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "currency": "INR",
    "paymentMethod": "upi",
    "orderId": "ORD_123456789",
    "userId": "user_123",
    "customerPhone": "+919876543210",
    "customerEmail": "customer@example.com",
    "customerName": "John Doe",
    "billingAddress": {
      "name": "John Doe",
      "street": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India"
    },
    "shippingAddress": {
      "name": "John Doe",
      "street": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India",
      "phone": "+919876543210"
    }
  }'
```

### 2. Create Card Payment

```bash
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "currency": "INR",
    "paymentMethod": "card",
    "orderId": "ORD_123456789",
    "userId": "user_123",
    "customerPhone": "+919876543210",
    "customerEmail": "customer@example.com",
    "customerName": "John Doe",
    "billingAddress": {
      "name": "John Doe",
      "street": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India"
    },
    "shippingAddress": {
      "name": "John Doe",
      "street": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India",
      "phone": "+919876543210"
    }
  }'
```

### 3. Create Cash on Delivery

```bash
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "currency": "INR",
    "paymentMethod": "cash_on_delivery",
    "orderId": "ORD_123456789",
    "userId": "user_123",
    "customerPhone": "+919876543210",
    "customerEmail": "customer@example.com",
    "customerName": "John Doe",
    "billingAddress": {
      "name": "John Doe",
      "street": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India"
    },
    "shippingAddress": {
      "name": "John Doe",
      "street": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India",
      "phone": "+919876543210"
    }
  }'
```

### 4. Calculate GST

```bash
curl -X POST http://localhost:3000/api/gst/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "gstRate": 18,
    "isInterState": false
  }'
```

## 🏛️ Indian Compliance Features

### GST Compliance
- Automatic GST calculation (CGST + SGST for intra-state, IGST for inter-state)
- Support for different GST rates (0%, 5%, 12%, 18%, 28%)
- GST number validation
- Invoice generation with GST details

### RBI Compliance
- 7-year data retention
- Secure payment processing
- Transaction logging and audit trails
- Fraud prevention measures

### PCI DSS Compliance
- Secure card data handling
- Tokenization support
- Encrypted data transmission
- Regular security audits

## 🔒 Security Features

- **Rate Limiting** - 50 requests per 15 minutes per IP
- **CORS** - Configurable for Indian domains
- **Helmet** - Security headers
- **Input Validation** - Comprehensive request validation
- **Error Handling** - Secure error responses
- **Logging** - Comprehensive audit logs

## 📱 Supported Payment Methods

### UPI
- PhonePe
- Paytm
- Google Pay
- BHIM
- Amazon Pay

### Cards
- Credit Cards (Visa, Mastercard, RuPay)
- Debit Cards (Visa, Mastercard, RuPay)

### Net Banking
- SBI, HDFC, ICICI, Axis, Kotak, PNB, and more

### Wallets
- Paytm, PhonePe, Mobikwik, Freecharge

### Cash on Delivery
- Pay when you receive

## 🚀 Deployment

### Production Checklist

1. **Environment Setup**
   - Set `NODE_ENV=production`
   - Configure production MongoDB
   - Set up SSL certificates

2. **Razorpay Configuration**
   - Switch to live API keys
   - Configure production webhooks
   - Set up proper success/failure URLs

3. **Security**
   - Enable rate limiting
   - Configure CORS for production domains
   - Set up monitoring and logging

4. **Database**
   - Set up MongoDB Atlas or production MongoDB
   - Configure backups
   - Set up monitoring

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🧪 Testing

```bash
# Run tests
npm test

# Test health endpoint
curl http://localhost:3000/health

# Test compliance endpoint
curl http://localhost:3000/compliance
```

## 📊 Monitoring

- Health check endpoint: `/health`
- Compliance endpoint: `/compliance`
- Webhook verification: `/api/webhooks/verify`
- Comprehensive logging with Morgan

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the API documentation
- Review the compliance guidelines

## 🔗 Useful Links

- [Razorpay Documentation](https://razorpay.com/docs/)
- [GST Portal](https://www.gst.gov.in/)
- [RBI Guidelines](https://www.rbi.org.in/)
- [PCI DSS Standards](https://www.pcisecuritystandards.org/)

---

**Built with ❤️ for India** 🇮🇳
