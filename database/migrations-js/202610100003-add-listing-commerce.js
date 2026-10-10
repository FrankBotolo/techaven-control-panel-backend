export async function up({ sequelize, transaction }) {
  const statements = [
    'ALTER TABLE carts MODIFY product_id INT NULL',
    'ALTER TABLE carts ADD COLUMN seller_listing_id INT NULL AFTER product_id',
    'ALTER TABLE carts ADD CONSTRAINT fk_carts_listing FOREIGN KEY (seller_listing_id) REFERENCES seller_listings(id) ON DELETE CASCADE',
    'ALTER TABLE carts ADD UNIQUE KEY uq_cart_user_listing (user_id, seller_listing_id)',
    'ALTER TABLE order_items MODIFY product_id INT NULL',
    'ALTER TABLE order_items ADD COLUMN seller_listing_id INT NULL AFTER product_id',
    'ALTER TABLE order_items ADD COLUMN canonical_snapshot JSON NULL AFTER seller_listing_id',
    'ALTER TABLE order_items ADD COLUMN listing_snapshot JSON NULL AFTER canonical_snapshot',
    'ALTER TABLE order_items ADD CONSTRAINT fk_order_items_listing FOREIGN KEY (seller_listing_id) REFERENCES seller_listings(id) ON DELETE SET NULL',
    'ALTER TABLE order_items ADD INDEX idx_order_items_listing (seller_listing_id)'
  ];
  for (const statement of statements) await sequelize.query(statement, { transaction });
}

export async function down({ sequelize, transaction }) {
  const statements = [
    'ALTER TABLE order_items DROP FOREIGN KEY fk_order_items_listing',
    'ALTER TABLE order_items DROP INDEX idx_order_items_listing',
    'ALTER TABLE order_items DROP COLUMN listing_snapshot, DROP COLUMN canonical_snapshot, DROP COLUMN seller_listing_id',
    'ALTER TABLE order_items MODIFY product_id INT NOT NULL',
    'ALTER TABLE carts DROP FOREIGN KEY fk_carts_listing',
    'ALTER TABLE carts DROP INDEX uq_cart_user_listing',
    'ALTER TABLE carts DROP COLUMN seller_listing_id',
    'ALTER TABLE carts MODIFY product_id INT NOT NULL'
  ];
  for (const statement of statements) await sequelize.query(statement, { transaction });
}
