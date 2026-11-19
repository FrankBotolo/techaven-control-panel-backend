import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const CatalogueProductRequest = sequelize.define('CatalogueProductRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shop_id: { type: DataTypes.INTEGER, allowNull: false },
  requested_by: { type: DataTypes.INTEGER, allowNull: false },
  brand: { type: DataTypes.STRING(160), allowNull: false },
  model: { type: DataTypes.STRING(220), allowNull: false },
  model_number: { type: DataTypes.STRING(160), allowNull: true },
  ram_gb: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
  storage_gb: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  network_generation: { type: DataTypes.STRING(40), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  proof_url: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), allowNull: false, defaultValue: 'pending' },
  reviewed_by: { type: DataTypes.INTEGER, allowNull: true },
  reviewed_at: { type: DataTypes.DATE, allowNull: true },
  resolution_notes: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'catalogue_product_requests', timestamps: true });

export default CatalogueProductRequest;
