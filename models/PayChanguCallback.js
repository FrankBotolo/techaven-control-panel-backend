import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PayChanguCallback = sequelize.define(
  'PayChanguCallback',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    callback_status: {
      type: DataTypes.STRING(32),
      allowNull: true
    },
    tx_ref: {
      type: DataTypes.STRING(191),
      allowNull: false
    },
    callback_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    callback_reference: {
      type: DataTypes.STRING(191),
      allowNull: true
    },
    raw_query: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    raw_url: {
      type: DataTypes.STRING(2048),
      allowNull: true
    },
    received_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    processing_state: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'received'
    },
    payment_reference: {
      type: DataTypes.STRING(191),
      allowNull: true
    },
    payment_status: {
      type: DataTypes.STRING(32),
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true
    },
    currency: {
      type: DataTypes.STRING(8),
      allowNull: true
    },
    charges: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true
    },
    channel: {
      type: DataTypes.STRING(64),
      allowNull: true
    },
    provider: {
      type: DataTypes.STRING(64),
      allowNull: true
    },
    mobile_number: {
      type: DataTypes.STRING(32),
      allowNull: true
    },
    customer_email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    customer_first_name: {
      type: DataTypes.STRING(128),
      allowNull: true
    },
    customer_last_name: {
      type: DataTypes.STRING(128),
      allowNull: true
    },
    meta_json: {
      type: DataTypes.JSON,
      allowNull: true
    },
    verified_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    verify_payload: {
      type: DataTypes.JSON,
      allowNull: true
    },
    verify_http_status: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    verify_error: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    shop_subscription_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    internal_error: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    tableName: 'paychangu_callbacks',
    timestamps: true,
    indexes: [
      { fields: ['tx_ref'] },
      { fields: ['received_at'] },
      { fields: ['order_id'] },
      { fields: ['processing_state'] }
    ]
  }
);

export default PayChanguCallback;
