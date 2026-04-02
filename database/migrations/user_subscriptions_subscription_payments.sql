-- User-centric subscription system (plans = existing subscription_packages)
-- Run manually if you do not rely on Sequelize sync.

CREATE TABLE IF NOT EXISTS subscription_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id INT NOT NULL COMMENT 'subscription_packages.id',
  amount DECIMAL(12, 2) NOT NULL,
  method VARCHAR(64) NOT NULL,
  status ENUM('pending', 'success', 'failed') NOT NULL DEFAULT 'pending',
  transaction_ref VARCHAR(80) NOT NULL,
  provider_payload JSON NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  UNIQUE KEY uq_subscription_payments_transaction_ref (transaction_ref),
  KEY idx_subscription_payments_user (user_id),
  KEY idx_subscription_payments_plan (plan_id),
  CONSTRAINT fk_subpay_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_subpay_plan FOREIGN KEY (plan_id) REFERENCES subscription_packages (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id INT NOT NULL COMMENT 'subscription_packages.id',
  payment_id INT NULL,
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  status ENUM('active', 'expired', 'canceled') NOT NULL DEFAULT 'active',
  payment_status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  KEY idx_user_subscriptions_user_status (user_id, status),
  KEY idx_user_subscriptions_end (end_date),
  CONSTRAINT fk_usersub_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_usersub_plan FOREIGN KEY (plan_id) REFERENCES subscription_packages (id) ON DELETE RESTRICT,
  CONSTRAINT fk_usersub_payment FOREIGN KEY (payment_id) REFERENCES subscription_payments (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
