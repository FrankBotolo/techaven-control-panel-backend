import { DataTypes } from 'sequelize';

/**
 * Fulfilment without seller acceptance: the seller marks a paid order as sent (courier/rider) or
 * handed over (collect at shop); the buyer uploads proof of delivery; an admin approves it and
 * only then is escrow released to the seller's wallet.
 */
const columns = {
  fulfilment_type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'delivery' },
  dispatched_at: { type: DataTypes.DATE, allowNull: true },
  delivery_proof_key: { type: DataTypes.STRING(255), allowNull: true },
  delivery_proof_status: { type: DataTypes.STRING(20), allowNull: true },
  delivery_proof_submitted_at: { type: DataTypes.DATE, allowNull: true },
  delivery_proof_reviewed_at: { type: DataTypes.DATE, allowNull: true },
  delivery_proof_reviewed_by: { type: DataTypes.INTEGER, allowNull: true },
  delivery_proof_rejection_reason: { type: DataTypes.STRING(1000), allowNull: true }
};

export async function up({ sequelize, transaction }) {
  const q = sequelize.getQueryInterface();
  const existing = await q.describeTable('orders');
  for (const [name, definition] of Object.entries(columns)) {
    if (!existing[name]) await q.addColumn('orders', name, definition, { transaction });
  }
  const indexes = await q.showIndex('orders', { transaction });
  if (!indexes.some((index) => index.name === 'orders_delivery_proof_queue')) {
    await q.addIndex('orders', ['delivery_proof_status', 'delivery_proof_submitted_at'], { name: 'orders_delivery_proof_queue', transaction });
  }
}

export async function down() {
  throw new Error('Delivery and escrow history must be retained; restore a reviewed backup instead of automatic rollback.');
}
