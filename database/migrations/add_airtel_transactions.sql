-- Airtel Money direct API transaction log (MySQL)
-- Run: mysql -u ... -p your_db < database/migrations/add_airtel_transactions.sql

CREATE TABLE IF NOT EXISTS airtel_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id VARCHAR(100) NULL COMMENT 'Airtel Money transaction ID',
  airtel_money_id VARCHAR(100) NULL COMMENT 'Airtel Money internal reference',
  reference VARCHAR(191) NULL COMMENT 'Merchant reference / order number',
  order_id INT NULL,
  shop_subscription_id INT NULL,
  msisdn VARCHAR(30) NULL,
  amount DECIMAL(12, 2) NULL,
  currency VARCHAR(3) NULL DEFAULT 'MWK',
  status VARCHAR(50) NULL COMMENT 'Raw status from Airtel (TS, SUCCESS, FAILED, etc.)',
  status_code VARCHAR(20) NULL COMMENT 'TS=success, TF=failed, TIP=in progress',
  message TEXT NULL,
  processing_state VARCHAR(50) NOT NULL DEFAULT 'received',
  raw_payload JSON NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_airtel_txn_transaction_id (transaction_id),
  INDEX idx_airtel_txn_reference (reference),
  INDEX idx_airtel_txn_order (order_id),
  INDEX idx_airtel_txn_shop_sub (shop_subscription_id),
  INDEX idx_airtel_txn_status (status),
  INDEX idx_airtel_txn_created (createdAt),
  CONSTRAINT fk_airtel_txn_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  CONSTRAINT fk_airtel_txn_shop_sub FOREIGN KEY (shop_subscription_id) REFERENCES shop_subscriptions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
