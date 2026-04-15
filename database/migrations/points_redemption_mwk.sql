-- Points redemption: per-shop MWK rate, per-user per-shop balances, platform default for legacy bucket.
-- Run after backup (MySQL 8+).

ALTER TABLE shops
  ADD COLUMN points_mwk_per_point DECIMAL(12, 4) NULL DEFAULT NULL
  COMMENT 'MWK credited per 1 loyalty point when redeeming points from this shop'
  AFTER total_sales;

ALTER TABLE platform_settings
  ADD COLUMN default_points_mwk_per_point DECIMAL(12, 4) NULL DEFAULT NULL
  COMMENT 'MWK per point for shop_id 0 (general/legacy) balances'
  AFTER seller_commission_percent;

CREATE TABLE IF NOT EXISTS user_shop_points (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  shop_id INT NOT NULL DEFAULT 0 COMMENT '0 = legacy/general; else shops.id',
  points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_shop_points_user_shop (user_id, shop_id),
  KEY idx_user_shop_points_user (user_id),
  CONSTRAINT fk_user_shop_points_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
