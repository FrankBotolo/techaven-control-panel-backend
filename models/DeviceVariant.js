import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DeviceVariant = sequelize.define('DeviceVariant', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  device_id: { type: DataTypes.INTEGER, allowNull: false },
  canonical_key: { type: DataTypes.STRING(500), allowNull: false, unique: true },
  model_number: { type: DataTypes.STRING(160), allowNull: true },
  ram_gb: { type: DataTypes.DECIMAL(8, 2), allowNull: true, validate: { min: 0.01 } },
  storage_gb: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, validate: { min: 1 } },
  network_generation: { type: DataTypes.STRING(40), allowNull: true },
  region: { type: DataTypes.STRING(100), allowNull: true },
  sim_type: { type: DataTypes.STRING(160), allowNull: true },
  attributes: { type: DataTypes.JSON, allowNull: true },
  source_metadata: { type: DataTypes.JSON, allowNull: true },
  verification_status: { type: DataTypes.ENUM('unverified', 'verified', 'rejected'), allowNull: false, defaultValue: 'unverified' },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { tableName: 'device_variants', timestamps: true });

export default DeviceVariant;
