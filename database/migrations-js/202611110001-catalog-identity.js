import { DataTypes } from 'sequelize';

export async function up({ sequelize, transaction }) {
  const query = sequelize.getQueryInterface();
  const columns = await query.describeTable('devices');
  if (!columns.canonical_device_id) {
    await query.addColumn('devices', 'canonical_device_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'devices', key: 'id' },
    }, { transaction });
  }
  await sequelize.query(`CREATE TABLE IF NOT EXISTS device_favorites (
    user_id INT NOT NULL,
    device_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, device_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(id)
  ) ENGINE=InnoDB`, { transaction });
}
