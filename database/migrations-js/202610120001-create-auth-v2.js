import { DataTypes } from 'sequelize';

export async function up({ queryInterface, transaction }) {
  const tables = new Set((await queryInterface.showAllTables()).map(String));
  const timestamps = {
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false }
  };
  const uuid = { type: DataTypes.UUID, primaryKey: true };
  const user = { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' };
  const definitions = {
    auth_v2_sessions: { id: uuid, user_id: user, expires_at: { type: DataTypes.DATE, allowNull: false }, revoked_at: DataTypes.DATE, ...timestamps },
    auth_v2_refresh_tokens: { hash: { type: DataTypes.STRING(64), primaryKey: true }, session_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'auth_v2_sessions', key: 'id' }, onDelete: 'CASCADE' }, used_at: DataTypes.DATE, ...timestamps },
    auth_v2_challenges: { id: uuid, type: { type: DataTypes.STRING(30), allowNull: false }, user_id: { ...user, allowNull: true }, identifier: DataTypes.STRING, secret_hash: { type: DataTypes.STRING(64), allowNull: false }, data: DataTypes.JSON, attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }, expires_at: { type: DataTypes.DATE, allowNull: false }, consumed_at: DataTypes.DATE, ...timestamps },
    auth_v2_rate_limits: { key: { type: DataTypes.STRING(64), primaryKey: true }, count: { type: DataTypes.INTEGER, allowNull: false }, expires_at: { type: DataTypes.DATE, allowNull: false } }
  };
  for (const [name, fields] of Object.entries(definitions)) {
    if (tables.has(name)) continue;
    await queryInterface.createTable(name, fields, { transaction });
    if (fields.user_id) await queryInterface.addIndex(name, ['user_id'], { transaction });
    if (fields.session_id) await queryInterface.addIndex(name, ['session_id'], { transaction });
    await queryInterface.addIndex(name, ['expires_at' in fields ? 'expires_at' : 'createdAt'], { transaction });
  }
}
export async function down({ queryInterface, transaction }) {
  for (const name of ['auth_v2_rate_limits', 'auth_v2_challenges', 'auth_v2_refresh_tokens', 'auth_v2_sessions']) {
    await queryInterface.dropTable(name, { transaction });
  }
}
