import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const UserSubscription = sequelize.define(
  'UserSubscription',
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
    payment_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'subscription_payments', key: 'id' }
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'expired', 'canceled'),
      allowNull: false,
      defaultValue: 'active'
    },
    payment_status: {
      type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
      allowNull: false,
      defaultValue: 'pending'
    }
  },
  {
    tableName: 'user_subscriptions',
    timestamps: true
  }
);

export default UserSubscription;
