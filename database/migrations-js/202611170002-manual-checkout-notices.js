export async function up({ sequelize, transaction }) {
  await sequelize.query(`CREATE TABLE IF NOT EXISTS manual_checkout_notices (
    checkout_group_id CHAR(36) PRIMARY KEY,
    order_id INT NOT NULL,
    deadline DATETIME(3) NOT NULL,
    email VARCHAR(254) NULL,
    summary TEXT NOT NULL,
    next_attempt DATETIME(3) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    sent_at DATETIME(3) NULL,
    INDEX manual_expiry_due (deadline),
    INDEX manual_email_due (sent_at, next_attempt)
  ) ENGINE=InnoDB`, { transaction });
}
