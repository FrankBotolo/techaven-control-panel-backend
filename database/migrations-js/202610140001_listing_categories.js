export async function up({ sequelize, transaction }) {
  await sequelize.query(`CREATE TABLE IF NOT EXISTS seller_listing_categories (
    listing_id INT NOT NULL,
    category_id INT NOT NULL,
    PRIMARY KEY (listing_id, category_id),
    FOREIGN KEY (listing_id) REFERENCES seller_listings(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    INDEX idx_listing_category (category_id, listing_id)
  ) ENGINE=InnoDB`, { transaction });
}
export async function down({ sequelize, transaction }) {
  await sequelize.query('DROP TABLE IF EXISTS seller_listing_categories', { transaction });
}
