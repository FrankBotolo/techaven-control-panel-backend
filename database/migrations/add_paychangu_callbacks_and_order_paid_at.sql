-- Pay Changu browser callback audit + order paid_at (MySQL)
-- Run: mysql -u ... -p your_db < database/migrations/add_paychangu_callbacks_and_order_paid_at.sql
--
-- If `paid_at` already exists on orders, comment out the ALTER below.

ALTER TABLE orders
  ADD COLUMN paid_at DATETIME NULL COMMENT 'When gateway confirmed payment' AFTER payment_status;

CREATE TABLE IF NOT EXISTS paychangu_callbacks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  callback_status VARCHAR(32) NULL,
  tx_ref VARCHAR(191) NOT NULL,
  callback_message TEXT NULL,
  callback_reference VARCHAR(191) NULL,
  raw_query TEXT NOT NULL,
  raw_url VARCHAR(2048) NULL,
  received_at DATETIME NOT NULL,
  processing_state VARCHAR(32) NOT NULL DEFAULT 'received',
  payment_reference VARCHAR(191) NULL,
  payment_status VARCHAR(32) NULL,
  amount DECIMAL(14, 2) NULL,
  currency VARCHAR(8) NULL,
  charges DECIMAL(14, 2) NULL,
  channel VARCHAR(64) NULL,
  provider VARCHAR(64) NULL,
  mobile_number VARCHAR(32) NULL,
  customer_email VARCHAR(255) NULL,
  customer_first_name VARCHAR(128) NULL,
  customer_last_name VARCHAR(128) NULL,
  meta_json JSON NULL,
  verified_at DATETIME NULL,
  verify_payload JSON NULL,
  verify_http_status INT NULL,
  verify_error TEXT NULL,
  order_id INT NULL,
  shop_subscription_id INT NULL,
  internal_error TEXT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_paychangu_callbacks_tx_ref (tx_ref),
  INDEX idx_paychangu_callbacks_received (received_at),
  INDEX idx_paychangu_callbacks_order (order_id),
  CONSTRAINT fk_paychangu_callbacks_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  CONSTRAINT fk_paychangu_callbacks_shop_sub FOREIGN KEY (shop_subscription_id) REFERENCES shop_subscriptions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
