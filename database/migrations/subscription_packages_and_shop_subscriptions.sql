-- Seller subscription plans (admin-managed) and per-shop subscriptions.
-- Run on MySQL 8+ after backup.

CREATE TABLE IF NOT EXISTS subscription_packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(191) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  description TEXT NULL,
  price_mwk DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'MWK',
  billing_period ENUM('monthly', 'quarterly', 'yearly', 'custom') NOT NULL DEFAULT 'monthly',
  duration_days INT NOT NULL DEFAULT 30,
  trial_days INT NOT NULL DEFAULT 0,
  features JSON NULL,
  limits JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sub_pkg_active_sort (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shop_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  package_id INT NOT NULL,
  status ENUM('pending_payment', 'trialing', 'active', 'past_due', 'canceled', 'expired') NOT NULL DEFAULT 'pending_payment',
  payment_status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  trial_ends_at DATETIME NULL,
  current_period_start DATETIME NULL,
  current_period_end DATETIME NULL,
  cancel_at_period_end TINYINT(1) NOT NULL DEFAULT 0,
  canceled_at DATETIME NULL,
  auto_renew TINYINT(1) NOT NULL DEFAULT 1,
  payment_reference VARCHAR(255) NULL,
  notes TEXT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_shop_sub_shop (shop_id),
  INDEX idx_shop_sub_status (status),
  INDEX idx_shop_sub_period_end (current_period_end),
  CONSTRAINT fk_shop_sub_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  CONSTRAINT fk_shop_sub_pkg FOREIGN KEY (package_id) REFERENCES subscription_packages(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
