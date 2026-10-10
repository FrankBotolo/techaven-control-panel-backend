import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DeviceVariantColor = sequelize.define('DeviceVariantColor', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  device_variant_id: { type: DataTypes.INTEGER, allowNull: false },
  color_id: { type: DataTypes.INTEGER, allowNull: false },
  manufacturer_name: { type: DataTypes.STRING(160), allowNull: false },
  slug: { type: DataTypes.STRING(180), allowNull: false },
  hex_override: { type: DataTypes.STRING(9), allowNull: true },
  verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, { tableName: 'device_variant_colors', timestamps: true, indexes: [{ unique: true, fields: ['device_variant_id', 'slug'] }] });

export default DeviceVariantColor;
