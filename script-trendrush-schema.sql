-- TrendRush-style schema for payment service (raw MySQL, no Sequelize).
-- Run this against your MySQL database (e.g. same DB as trendRushBackend or standalone).
-- Uses same table names and structure as trendRushBackend for consistency.

-- Addresses (referenced by payment_details.address_id and payment_billing_address.address_id)
CREATE TABLE IF NOT EXISTS addresses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  street VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(20),
  country VARCHAR(100) DEFAULT 'India',
  phone VARCHAR(20),
  landmark VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Orders (norders – numeric order_id, order_number for display)
CREATE TABLE IF NOT EXISTS norders (
  order_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(255) NOT NULL UNIQUE,
  user_id VARCHAR(255) NOT NULL,
  total_items INT DEFAULT 0,
  total_stores INT DEFAULT 1,
  subtotal DECIMAL(12,2) DEFAULT 0,
  discount DECIMAL(12,2) DEFAULT 0,
  tax DECIMAL(12,2) DEFAULT 0,
  shipping_fee DECIMAL(12,2) DEFAULT 0,
  grand_total DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(50),
  payment_status VARCHAR(50) DEFAULT 'PENDING',
  order_status VARCHAR(50) DEFAULT 'PENDING',
  shipping_address_id BIGINT UNSIGNED NULL,
  billing_address_id BIGINT UNSIGNED NULL,
  notes TEXT,
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order_number (order_number),
  INDEX idx_user_id (user_id),
  INDEX idx_payment_status (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Order line items (optional; can also store items in norders.metadata)
CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NULL,
  sku_id BIGINT UNSIGNED NULL,
  product_name VARCHAR(255),
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  discount DECIMAL(12,2) DEFAULT 0,
  final_price DECIMAL(12,2) NOT NULL,
  item_status VARCHAR(50) DEFAULT 'PENDING',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order_id (order_id),
  FOREIGN KEY (order_id) REFERENCES norders(order_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Payment info (one row per payment, links to norders.order_id)
CREATE TABLE IF NOT EXISTS payment_info (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  payment_method VARCHAR(50) NOT NULL,
  payment_provider VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_order_payment (order_id),
  INDEX idx_order_id (order_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  FOREIGN KEY (order_id) REFERENCES norders(order_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Payment provider details (razorpay, upi, card, etc.)
CREATE TABLE IF NOT EXISTS payment_details (
  payment_id BIGINT UNSIGNED PRIMARY KEY,
  upi_id VARCHAR(255),
  upi_app VARCHAR(100),
  upi_transaction_id VARCHAR(255),
  card_last4 VARCHAR(4),
  card_brand VARCHAR(50),
  card_type VARCHAR(50),
  razorpay_payment_id VARCHAR(255),
  razorpay_order_id VARCHAR(255),
  razorpay_signature TEXT,
  payu_payment_id VARCHAR(255),
  payu_transaction_id VARCHAR(255),
  phonepe_transaction_id VARCHAR(255),
  phonepe_merchant_transaction_id VARCHAR(255),
  address_id BIGINT UNSIGNED NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_razorpay_order_id (razorpay_order_id),
  INDEX idx_razorpay_payment_id (razorpay_payment_id),
  FOREIGN KEY (payment_id) REFERENCES payment_info(id) ON DELETE CASCADE,
  FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- GST details per payment
CREATE TABLE IF NOT EXISTS payment_gst_details (
  payment_id BIGINT UNSIGNED PRIMARY KEY,
  gst_number VARCHAR(50),
  gst_rate DECIMAL(5,2) DEFAULT 18,
  cgst DECIMAL(12,2) DEFAULT 0,
  sgst DECIMAL(12,2) DEFAULT 0,
  igst DECIMAL(12,2) DEFAULT 0,
  total_gst DECIMAL(12,2) DEFAULT 0,
  taxable_amount DECIMAL(12,2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES payment_info(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Payment metadata (user, description)
CREATE TABLE IF NOT EXISTS payment_metadata (
  payment_id BIGINT UNSIGNED PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES payment_info(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Billing address link
CREATE TABLE IF NOT EXISTS payment_billing_address (
  payment_id BIGINT UNSIGNED PRIMARY KEY,
  address_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES payment_info(id) ON DELETE CASCADE,
  FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Line items for payment (invoice-style)
CREATE TABLE IF NOT EXISTS payment_metadata_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payment_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255),
  quantity INT DEFAULT 1,
  price DECIMAL(12,2) DEFAULT 0,
  gst_rate DECIMAL(5,2) DEFAULT 18,
  hsn_code VARCHAR(20),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payment_id (payment_id),
  FOREIGN KEY (payment_id) REFERENCES payment_info(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Refunds
CREATE TABLE IF NOT EXISTS payment_refunds (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payment_id BIGINT UNSIGNED NOT NULL,
  refund_reference VARCHAR(255),
  refund_amount DECIMAL(12,2) NOT NULL,
  refund_reason TEXT,
  refunded_at DATETIME NOT NULL,
  refund_status VARCHAR(50) DEFAULT 'processed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payment_id (payment_id),
  FOREIGN KEY (payment_id) REFERENCES payment_info(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
