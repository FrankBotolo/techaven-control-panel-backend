import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SubscriptionPayment = sequelize.define(
  'SubscriptionPayment',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    plan_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'subscription_packages', key: 'id' }
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    method: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'success', 'failed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    transaction_ref: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true
    },
    provider_payload: {
      type: DataTypes.JSON,
      allowNull: true
    }
  },
  {
    tableName: 'subscription_payments',
    timestamps: true
  }
);

export default SubscriptionPayment;
