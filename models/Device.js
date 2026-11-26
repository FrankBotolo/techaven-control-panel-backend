import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Device = sequelize.define('Device', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  canonical_device_id: { type: DataTypes.INTEGER, allowNull: true },
  brand_id: { type: DataTypes.INTEGER, allowNull: false },
  category_id: { type: DataTypes.INTEGER, allowNull: false },
  slug: { type: DataTypes.STRING(220), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(220), allowNull: false },
  release_date: { type: DataTypes.DATEONLY, allowNull: true },
  soc: { type: DataTypes.STRING(180), allowNull: true },
  battery_mah: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  os_family: { type: DataTypes.STRING(80), allowNull: true },
  verification_status: { type: DataTypes.ENUM('unverified', 'verified', 'rejected'), allowNull: false, defaultValue: 'unverified' },
  specs: { type: DataTypes.JSON, allowNull: true },
  source_metadata: { type: DataTypes.JSON, allowNull: true },
  primary_image_url: { type: DataTypes.TEXT, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { tableName: 'devices', timestamps: true });

export default Device;
