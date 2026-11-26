/**
 * Indexes for catalogue list pages. Without them MySQL sorts every active device by name in a
 * temporary table on each request (54k+ rows), which made public device lists take about a second.
 */
const indexes = [
  { table: 'devices', name: 'devices_active_name', fields: ['is_active', 'name'] },
  { table: 'devices', name: 'devices_brand_active_name', fields: ['brand_id', 'is_active', 'name'] },
  { table: 'devices', name: 'devices_name_id', fields: ['name', 'id'] },
  { table: 'device_variants', name: 'device_variants_device_active', fields: ['device_id', 'is_active'] }
];

export async function up({ sequelize, transaction }) {
  const q = sequelize.getQueryInterface();
  for (const index of indexes) {
    const existing = await q.showIndex(index.table, { transaction });
    if (existing.some((row) => row.name === index.name)) continue;
    await q.addIndex(index.table, index.fields, { name: index.name, transaction });
  }
}

export async function down({ sequelize, transaction }) {
  const q = sequelize.getQueryInterface();
  for (const index of indexes) {
    const existing = await q.showIndex(index.table, { transaction });
    if (existing.some((row) => row.name === index.name)) {
      await q.removeIndex(index.table, index.name, { transaction });
    }
  }
}
