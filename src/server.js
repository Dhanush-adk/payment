const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');
const paymentRoutes = require('./routes/payment');
const orderRoutes = require('./routes/order');
const webhookRoutes = require('./routes/webhook');
const gstRoutes = require('./routes/gst');

const app = express();

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration for Indian domains
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.in', 'https://www.yourdomain.in'] 
    : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://localhost:8081', 'http://127.0.0.1:8081'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting - stricter for Indian market
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Reduced limit for Indian market
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Compression and logging
app.use(compression());
app.use(morgan('combined'));

// Routes
app.use('/api/payments', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/gst', gstRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    country: 'IN',
    currency: 'INR',
    timezone: 'Asia/Kolkata'
  });
});

// Indian compliance endpoint
app.get('/compliance', (req, res) => {
  res.status(200).json({
    country: 'India',
    currency: 'INR',
    gstCompliant: true,
    dataRetention: '7 years',
    pciCompliant: true,
    rbiCompliant: true,
    supportedPaymentMethods: ['UPI', 'Cards', 'Net Banking', 'Wallets', 'Cash on Delivery'],
    supportedUPIApps: ['PhonePe', 'Paytm', 'Google Pay', 'BHIM', 'Amazon Pay']
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    availableEndpoints: [
      'GET /health',
      'GET /compliance',
      'POST /api/payments/create',
      'POST /api/payments/confirm',
      'GET /api/payments/status/:paymentId',
      'POST /api/orders/create',
      'GET /api/orders/:orderId'
    ]
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🇮🇳 Payment API server running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Compliance info: http://localhost:${PORT}/compliance`);
  console.log(`⏰ Server timezone: Asia/Kolkata`);
});

module.exports = app;
