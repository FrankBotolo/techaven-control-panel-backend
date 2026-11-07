import { DataTypes } from 'sequelize';
export async function up({ sequelize, transaction }) {
  const q = sequelize.getQueryInterface();
  const columns = await q.describeTable('users');
  // Existing customers are exempt. Only subsequent inserts enroll in setup.
  if (!columns.onboarding_required) {
    await q.addColumn('users', 'onboarding_required', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, { transaction });
  }
  await q.changeColumn('users', 'onboarding_required', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }, { transaction });
  if (!columns.address_completed_at) await q.addColumn('users', 'address_completed_at', { type: DataTypes.DATE, allowNull: true }, { transaction });
  if (!columns.payment_setup_status) await q.addColumn('users', 'payment_setup_status', { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' }, { transaction });
  await sequelize.query(`CREATE TABLE IF NOT EXISTS customer_payment_methods (
    id CHAR(36) PRIMARY KEY, user_id INT NOT NULL, type VARCHAR(30) NOT NULL DEFAULT 'mobile_money',
    provider VARCHAR(50) NOT NULL, phone_number VARCHAR(20) NOT NULL, is_default BOOLEAN NOT NULL DEFAULT FALSE,
    createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL,
    UNIQUE KEY customer_payment_unique (user_id, provider, phone_number),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`, { transaction });
}
export async function down() { throw new Error('Retain customer preferences; use a reviewed rollback instead.'); }
