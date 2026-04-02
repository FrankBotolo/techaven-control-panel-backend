import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const MalipoTransaction = sequelize.define('MalipoTransaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  transaction_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Malipo transaction ID (e.g. IP260317-1344-B0AE)'
  },
  merchant_txn_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Order number / merchant reference'
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'orders', key: 'id' }
  },
  shop_subscription_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'shop_subscriptions', key: 'id' }
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: true,
    defaultValue: 'MWK'
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Completed, Failed, Pending, etc.'
  },
  customer_ref: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  narration: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  psp_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '1=Airtel, 2=TNM'
  },
  raw_payload: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Full webhook payload for debugging'
  }
}, {
  tableName: 'malipo_transactions',
  timestamps: true,
  indexes: [
    { fields: ['transaction_id'] },
    { fields: ['merchant_txn_id'] },
    { fields: ['order_id'] },
    { fields: ['shop_subscription_id'] },
    { fields: ['status'] },
    { fields: ['createdAt'] }
  ]
});

export default MalipoTransaction;
