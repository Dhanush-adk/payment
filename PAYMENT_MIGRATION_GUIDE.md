# Payment Table Migration: MongoDB to MySQL

This document describes the migration of the payments table from MongoDB to MySQL while keeping the orders table in MongoDB.

## Overview

The payment system has been migrated from MongoDB to MySQL using Sequelize ORM, while maintaining full compatibility with the existing API endpoints and functionality.

## Changes Made

### 1. Database Configuration (`src/config/database.js`)
- Added MySQL connection using Sequelize
- Maintained MongoDB connection for Orders
- Both databases connect simultaneously

### 2. New MySQL Payment Model (`src/models/PaymentMySQL.js`)
- Created Sequelize model with flattened structure
- Maintained all original fields and functionality
- Added proper indexes for performance
- Included GST calculation hooks

### 3. Updated Payment Routes (`src/routes/payment.js`)
- Changed from Mongoose to Sequelize operations
- Updated all CRUD operations to use MySQL
- Maintained API compatibility

### 4. Environment Configuration (`env.example`)
- Added MySQL connection parameters
- Maintained MongoDB configuration

## Database Schema

The MySQL payments table includes all fields from the original MongoDB schema:

### Core Fields
- `id` (Primary Key, Auto Increment)
- `orderId` (Unique)
- `userId`
- `amount` (DECIMAL)
- `currency`
- `paymentMethod` (ENUM)
- `paymentProvider` (ENUM)
- `status` (ENUM)

### Payment Details (Flattened)
- UPI: `upiId`, `upiApp`, `upiTransactionId`
- Card: `cardLast4`, `cardBrand`, `cardType`
- Razorpay: `razorpayPaymentId`, `razorpayOrderId`, `razorpaySignature`
- PayU: `payuPaymentId`, `payuTransactionId`
- PhonePe: `phonepeTransactionId`, `phonepeMerchantTransactionId`
- COD: `deliveryName`, `deliveryStreet`, `deliveryCity`, etc.

### GST Details
- `gstNumber`, `gstRate`, `cgst`, `sgst`, `igst`, `totalGst`, `taxableAmount`

### Customer Metadata
- `customerEmail`, `customerPhone`, `customerName`, `description`
- Billing address fields
- Refund details
- Compliance flags

## Setup Instructions

### 1. Install Dependencies
```bash
npm install mysql2 sequelize
```

### 2. Configure Environment Variables
Add MySQL configuration to your `.env` file:
```env
# MySQL Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=payment_api_india
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
```

### 3. Initialize MySQL Database
```bash
npm run init-mysql
```

### 4. Test the Migration
```bash
npm run test-payment-migration
```

### 5. Start the Server
```bash
npm start
# or for development
npm run dev
```

## API Compatibility

All existing API endpoints remain unchanged:

- `POST /api/payments/create` - Create payment
- `POST /api/payments/confirm` - Confirm payment
- `GET /api/payments/status/:paymentId` - Get payment status
- `POST /api/payments/refund` - Process refund
- `GET /api/payments/methods` - Get supported methods

## Data Migration (Optional)

If you have existing payment data in MongoDB that needs to be migrated:

1. Export data from MongoDB
2. Transform the nested structure to flattened MySQL structure
3. Import into MySQL using the new schema

## Performance Considerations

- Added indexes on frequently queried fields
- Used appropriate data types (DECIMAL for amounts)
- Maintained connection pooling
- GST calculations handled at database level

## Rollback Plan

To rollback to MongoDB:
1. Revert `src/routes/payment.js` to use `Payment` instead of `PaymentMySQL`
2. Remove MySQL dependencies
3. Update `src/config/database.js` to only connect MongoDB

## Testing

The migration includes comprehensive tests:
- Database connection tests
- CRUD operation tests
- GST calculation tests
- API endpoint compatibility tests

## Support

All existing functionality is preserved:
- UPI payments
- Card payments
- Net banking
- Wallet payments
- Cash on delivery
- GST calculations
- Refund processing
- Compliance features
