-- Platform commission rate (admin-managed) and per-order commission snapshot.
-- Run after backup. Compatible with MySQL 8+.

CREATE TABLE IF NOT EXISTS platform_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  seller_commission_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ensure at least one row exists (optional; API also creates on first read)
INSERT INTO platform_settings (seller_commission_percent)
SELECT 0 FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM platform_settings LIMIT 1);

ALTER TABLE orders
  ADD COLUMN seller_gross_subtotal DECIMAL(12, 2) NULL COMMENT 'Seller item subtotal before platform commission' AFTER escrow_amount,
  ADD COLUMN platform_commission_percent DECIMAL(5, 2) NULL COMMENT 'Commission % applied at order time' AFTER seller_gross_subtotal,
  ADD COLUMN platform_fee_amount DECIMAL(12, 2) NULL COMMENT 'Platform fee (MWK) deducted from seller gross' AFTER platform_commission_percent;
