import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const AirtelTransaction = sequelize.define('AirtelTransaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  transaction_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Airtel Money transaction ID (e.g. CI210903.1344.B0AE1B)'
  },
  airtel_money_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Airtel Money internal reference'
  },
  reference: {
    type: DataTypes.STRING(191),
    allowNull: true,
    comment: 'Merchant reference / order number'
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
  msisdn: {
    type: DataTypes.STRING(30),
    allowNull: true
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
    allowNull: true,
    comment: 'Raw status from Airtel (TS, TF, SUCCESS, FAILED, etc.)'
  },
  status_code: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Airtel status_code (TS=success, TF=failed, TIP=in progress)'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  processing_state: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'received',
    comment: 'received | order_paid | subscription_activated | order_not_found | amount_mismatch | non_success | error'
  },
  raw_payload: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Full webhook payload for debugging'
  }
}, {
  tableName: 'airtel_transactions',
  timestamps: true,
  indexes: [
    { fields: ['transaction_id'] },
    { fields: ['reference'] },
    { fields: ['status'] },
    { fields: ['createdAt'] }
  ]
});

export default AirtelTransaction;
