import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * Admin-defined plans sellers can subscribe to (e.g. Starter, Growth, Pro).
 */
const SubscriptionPackage = sequelize.define(
  'SubscriptionPackage',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    slug: {
      type: DataTypes.STRING(191),
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING(160),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    /** Price in MWK per billing period */
    price_mwk: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(8),
      allowNull: false,
      defaultValue: 'MWK'
    },
    billing_period: {
      type: DataTypes.ENUM('monthly', 'quarterly', 'yearly', 'custom'),
      allowNull: false,
      defaultValue: 'monthly'
    },
    /** Length of one billing cycle (e.g. 30 for monthly) */
    duration_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30
    },
    trial_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    /** Display bullets / feature list */
    features: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    /** Quotas: { max_products, max_staff, featured_slots, priority_support } null = unlimited */
    limits: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  },
  {
    tableName: 'subscription_packages',
    timestamps: true,
    indexes: [{ fields: ['is_active', 'sort_order'] }]
  }
);

export default SubscriptionPackage;
