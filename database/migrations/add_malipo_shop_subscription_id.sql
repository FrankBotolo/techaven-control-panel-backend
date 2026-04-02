-- Links Malipo webhook rows to shop_subscriptions when merchant_txn_id is SUB-{id}
ALTER TABLE malipo_transactions
  ADD COLUMN shop_subscription_id INT NULL
    COMMENT 'FK to shop_subscriptions when payment is for a subscription'
    AFTER order_id;

ALTER TABLE malipo_transactions
  ADD INDEX idx_malipo_txn_shop_sub (shop_subscription_id);

ALTER TABLE malipo_transactions
  ADD CONSTRAINT fk_malipo_txn_shop_subscription
    FOREIGN KEY (shop_subscription_id) REFERENCES shop_subscriptions(id) ON DELETE SET NULL;
