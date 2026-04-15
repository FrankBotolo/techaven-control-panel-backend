import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * Singleton-style platform config (first row is authoritative).
 * seller_commission_percent: portion of each seller's item subtotal retained by the platform (0–100).
 */
const PlatformSetting = sequelize.define(
  'PlatformSetting',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    seller_commission_percent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0
    },
    /** MWK per point for shop_id 0 (legacy) balances; sellers set shop-specific rates on shops. */
    default_points_mwk_per_point: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: true,
      defaultValue: null
    }
  },
  {
    tableName: 'platform_settings',
    timestamps: true
  }
);

export default PlatformSetting;
