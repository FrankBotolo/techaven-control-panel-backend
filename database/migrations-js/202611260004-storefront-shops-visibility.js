import { DataTypes } from 'sequelize';

/** Lets admins hide the storefront's Shops tab while products (and their sellers) stay visible. */
export async function up({ sequelize, transaction }) {
  const q = sequelize.getQueryInterface();
  const columns = await q.describeTable('platform_settings');
  if (!columns.shops_tab_hidden) {
    await q.addColumn(
      'platform_settings',
      'shops_tab_hidden',
      { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      { transaction }
    );
  }
}

export async function down({ sequelize, transaction }) {
  await sequelize.getQueryInterface().removeColumn('platform_settings', 'shops_tab_hidden', { transaction });
}
