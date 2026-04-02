-- Align user_subscriptions with payment lifecycle (mirrors shop_subscriptions.payment_status)
ALTER TABLE user_subscriptions
  ADD COLUMN payment_status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending'
  AFTER status;

UPDATE user_subscriptions
SET payment_status = 'paid'
WHERE payment_id IS NOT NULL OR status = 'active';
