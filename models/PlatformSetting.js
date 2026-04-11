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
    }
  },
  {
    tableName: 'platform_settings',
    timestamps: true
  }
);

export default PlatformSetting;
