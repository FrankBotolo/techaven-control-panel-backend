-- Unconditional Airtel webhook capture log (MySQL)
-- Run: mysql -u ... -p your_db < database/migrations/add_airtel_webhook_logs.sql

CREATE TABLE IF NOT EXISTS airtel_webhook_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  method VARCHAR(10) NULL,
  headers JSON NULL,
  body JSON NULL COMMENT 'Parsed JSON body, when parseable',
  raw_body LONGTEXT NULL COMMENT 'Raw request body exactly as received, captured even when JSON parsing fails',
  ip VARCHAR(64) NULL,
  note VARCHAR(255) NULL COMMENT 'e.g. JSON parse error message, invalid signature',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_airtel_webhook_logs_created (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
