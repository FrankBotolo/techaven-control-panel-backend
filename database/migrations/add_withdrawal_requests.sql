-- Migration: Seller withdrawal requests (withdraw only after escrow release)
-- Sellers can request withdrawal of available balance only; admin processes payouts.

USE chiwaya_db;

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'MWK',
  status ENUM('pending', 'processing', 'completed', 'rejected') NOT NULL DEFAULT 'pending',
  withdrawal_method ENUM('mobile_money', 'bank_transfer') NOT NULL DEFAULT 'mobile_money',
  account_number VARCHAR(100),
  account_name VARCHAR(255),
  admin_notes TEXT,
  processed_by INT NULL,
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
