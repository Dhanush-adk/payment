const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { pool } = require('./models/db');
const swaggerUi = require('swagger-ui-express');
const openApiSpec = require('./openapi.json');
if (process.env.API_BASE_URL) {
  openApiSpec.servers = [{ url: process.env.API_BASE_URL, description: 'API' }];
}
const paymentRoutes = require('./routes/payment');
const orderRoutes = require('./routes/order');
const webhookRoutes = require('./routes/webhook');
const gstRoutes = require('./routes/gst');

const app = express();

// Verify MySQL connection (raw pool, trendRushBackend-style)
(async () => {
  try {
    const conn = await pool.getConnection();
    await conn.query('SELECT 1');
    conn.release();
    console.log(`🗄️ MySQL Connected: ${process.env.MYSQL_HOST || 'localhost'}`);
    console.log(`🇮🇳 Database configured for India (INR, GST compliant)`);
  } catch (err) {
    console.error('❌ MySQL connection error:', err.message);
    process.exit(1);
  }
})();

// Security middleware – in development disable CSP so /test page (Razorpay, inline scripts) works
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production'
    ? {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "https://checkout.razorpay.com"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      }
    : false,
}));

// CORS configuration for Indian domains
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow all localhost origins and null origin
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // In production, only allow specific domains (set CORS_ALLOWED_ORIGINS in .env, e.g. https://app.example.com,https://www.example.com)
    const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'https://yourdomain.in,https://www.yourdomain.in').split(',').map(s => s.trim());
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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

// Serve test frontend at /test (local testing)
app.get('/test', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'payment-test.html'));
});

// Swagger / OpenAPI docs (not under /api so not rate-limited)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
  customSiteTitle: 'Payment API (India) – Swagger',
  customCss: '.swagger-ui .topbar { display: none }',
}));

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
      'GET /api-docs',
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
