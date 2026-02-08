-- Migration: Add Escrow functionality to Orders
-- Run this script to add escrow-based order management

USE chiwaya_db;

-- Add escrow-related columns to orders table
ALTER TABLE orders
ADD COLUMN courier_service VARCHAR(255) NULL COMMENT 'Selected courier service name',
ADD COLUMN courier_tracking_number VARCHAR(255) NULL COMMENT 'Tracking number from courier',
ADD COLUMN seller_id INT NULL COMMENT 'Seller user ID (for single-seller orders)',
ADD COLUMN escrow_status ENUM('pending', 'held', 'released', 'refunded') NOT NULL DEFAULT 'pending' COMMENT 'Status of escrow funds',
ADD COLUMN escrow_amount DECIMAL(12, 2) NULL COMMENT 'Amount held in escrow (seller portion)',
ADD COLUMN delivery_confirmed_at TIMESTAMP NULL COMMENT 'When customer confirmed delivery',
ADD COLUMN funds_released_at TIMESTAMP NULL COMMENT 'When funds were released to seller',
ADD INDEX idx_seller (seller_id),
ADD INDEX idx_escrow_status (escrow_status),
ADD FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL;

-- Create escrow table to track all escrow transactions
CREATE TABLE IF NOT EXISTS escrows (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  seller_id INT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL COMMENT 'Amount held in escrow',
  currency VARCHAR(3) NOT NULL DEFAULT 'MWK',
  status ENUM('pending', 'held', 'released', 'refunded') NOT NULL DEFAULT 'pending',
  held_at TIMESTAMP NULL COMMENT 'When funds were held',
  released_at TIMESTAMP NULL COMMENT 'When funds were released',
  refunded_at TIMESTAMP NULL COMMENT 'When funds were refunded',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_order (order_id),
  INDEX idx_seller (seller_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

