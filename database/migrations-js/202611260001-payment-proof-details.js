import { DataTypes } from 'sequelize';

/** Bank-transfer proofs record the payer's bank and declared amount; receipts live in object storage (R2). */
export async function up({ sequelize, transaction }) {
  const q = sequelize.getQueryInterface();
  const columns = await q.describeTable('payment_submissions');
  const added = {
    payer_bank: { type: DataTypes.STRING(120), allowNull: true },
    declared_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    receipt_key: { type: DataTypes.STRING(255), allowNull: true },
    receipt_url: { type: DataTypes.STRING(500), allowNull: true }
  };
  for (const [name, definition] of Object.entries(added)) {
    if (!columns[name]) await q.addColumn('payment_submissions', name, definition, { transaction });
  }
  // Existing rows keep their values; new submissions may omit the reference or store the receipt remotely.
  if (!columns.receipt_file.allowNull) {
    await q.changeColumn('payment_submissions', 'receipt_file', { type: DataTypes.STRING(80), allowNull: true }, { transaction });
  }
  if (!columns.payment_reference.allowNull) {
    await q.changeColumn('payment_submissions', 'payment_reference', { type: DataTypes.STRING(160), allowNull: true }, { transaction });
  }
}

export async function down() {
  throw new Error('Payment history must be retained; restore a reviewed backup instead of automatic rollback.');
}
