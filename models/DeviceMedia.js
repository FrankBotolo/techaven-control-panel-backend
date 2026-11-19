import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DeviceMedia = sequelize.define('DeviceMedia', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  device_id: { type: DataTypes.INTEGER, allowNull: false },
  device_variant_id: { type: DataTypes.INTEGER, allowNull: true },
  device_variant_color_id: { type: DataTypes.INTEGER, allowNull: true },
  url: { type: DataTypes.TEXT, allowNull: false },
  storage_key: { type: DataTypes.STRING(500), allowNull: true },
  media_type: { type: DataTypes.ENUM('image', 'video'), allowNull: false, defaultValue: 'image' },
  sort_order: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  is_primary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  source: { type: DataTypes.STRING(180), allowNull: true }
}, { tableName: 'device_media', timestamps: true });

export default DeviceMedia;
