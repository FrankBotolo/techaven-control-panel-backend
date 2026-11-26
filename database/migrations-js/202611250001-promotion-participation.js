export async function up({ sequelize, transaction }) {
  await sequelize.query(`CREATE TABLE IF NOT EXISTS promotion_participations (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    campaign_slug VARCHAR(191) NOT NULL,
    shop_id INT NOT NULL, listing_id INT NOT NULL, requested_by INT NOT NULL,
    status ENUM('pending','approved','rejected','withdrawn') NOT NULL DEFAULT 'pending',
    offer_snapshot JSON NOT NULL, review_note VARCHAR(1000) NULL,
    reviewed_by INT NULL, reviewed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY promotion_offer_once (campaign_slug,listing_id),
    INDEX promotion_review_queue (campaign_slug,status),
    FOREIGN KEY (shop_id) REFERENCES shops(id),
    FOREIGN KEY (listing_id) REFERENCES seller_listings(id),
    FOREIGN KEY (requested_by) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
  ) ENGINE=InnoDB`, { transaction });
}
export async function down() { throw new Error('Retain participation review history; use a reviewed backup for rollback.'); }
