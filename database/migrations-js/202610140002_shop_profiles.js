export async function up({ sequelize, transaction }) {
  const query = sequelize.getQueryInterface();
  const { DataTypes } = await import('sequelize');
  if (!(await query.describeTable('shops')).profile) await query.addColumn('shops', 'profile', { type: DataTypes.JSON, allowNull: true }, { transaction });
  if (!(await query.describeTable('seller_listings')).details) await query.addColumn('seller_listings', 'details', { type: DataTypes.JSON, allowNull: true }, { transaction });
}
export async function down({ sequelize, transaction }) {
  await sequelize.getQueryInterface().removeColumn('seller_listings', 'details', { transaction });
  await sequelize.getQueryInterface().removeColumn('shops', 'profile', { transaction });
}
