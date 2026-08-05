import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ShopSubscription = sequelize.define(
  'ShopSubscription',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    shop_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'shops', key: 'id' }
    },
    package_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'subscription_packages', key: 'id' }
    },
    status: {
      type: DataTypes.ENUM(
        'pending_payment',
        'trialing',
        'active',
        'past_due',
        'canceled',
        'expired'
      ),
      allowNull: false,
      defaultValue: 'pending_payment'
    },
    payment_status: {
      type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
      allowNull: false,
      defaultValue: 'pending'
    },
    trial_ends_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    current_period_start: {
      type: DataTypes.DATE,
      allowNull: true
    },
    current_period_end: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancel_at_period_end: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    canceled_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    auto_renew: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    payment_reference: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  },
  {
    tableName: 'shop_subscriptions',
    timestamps: true,
    indexes: [
      { fields: ['status'] },
      { fields: ['current_period_end'] }
    ]
  }
);

export default ShopSubscription;
