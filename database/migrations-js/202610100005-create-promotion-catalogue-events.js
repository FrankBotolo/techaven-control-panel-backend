export async function up({ sequelize, transaction }) {
  await sequelize.query(`CREATE TABLE promotion_catalogue_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    kind ENUM('device','shop') NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    payload JSON NOT NULL,
    dedupe_key VARCHAR(255) NOT NULL UNIQUE,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_promotion_events_kind_id (kind, id),
    INDEX idx_promotion_events_external (kind, external_id)
  ) ENGINE=InnoDB`, { transaction });
}

export async function down({ sequelize, transaction }) {
  await sequelize.query('DROP TABLE IF EXISTS promotion_catalogue_events', { transaction });
}
