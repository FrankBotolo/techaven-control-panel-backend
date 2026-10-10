export async function up({ sequelize, transaction }) {
  await sequelize.query(`CREATE TABLE legacy_product_catalogue_links (
    id INT AUTO_INCREMENT PRIMARY KEY, product_id INT NOT NULL UNIQUE, candidate_variant_id INT NULL,
    seller_listing_id INT NULL, match_status ENUM('unmatched','candidate','confirmed','rejected') NOT NULL DEFAULT 'unmatched',
    confidence DECIMAL(5,4) NULL, match_report JSON NULL, reviewed_by INT NULL, reviewed_at DATETIME NULL,
    createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL,
    CONSTRAINT fk_legacy_links_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_legacy_links_variant FOREIGN KEY (candidate_variant_id) REFERENCES device_variants(id) ON DELETE SET NULL,
    CONSTRAINT fk_legacy_links_listing FOREIGN KEY (seller_listing_id) REFERENCES seller_listings(id) ON DELETE SET NULL,
    CONSTRAINT fk_legacy_links_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_legacy_links_status (match_status), INDEX idx_legacy_links_variant (candidate_variant_id)
  ) ENGINE=InnoDB`, { transaction });
}

export async function down({ sequelize, transaction }) {
  await sequelize.query('DROP TABLE IF EXISTS legacy_product_catalogue_links', { transaction });
}
