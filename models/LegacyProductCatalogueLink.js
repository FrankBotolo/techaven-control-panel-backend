import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const LegacyProductCatalogueLink = sequelize.define('LegacyProductCatalogueLink', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  candidate_variant_id: { type: DataTypes.INTEGER, allowNull: true },
  seller_listing_id: { type: DataTypes.INTEGER, allowNull: true },
  match_status: { type: DataTypes.ENUM('unmatched', 'candidate', 'confirmed', 'rejected'), allowNull: false, defaultValue: 'unmatched' },
  confidence: { type: DataTypes.DECIMAL(5, 4), allowNull: true },
  match_report: { type: DataTypes.JSON, allowNull: true },
  reviewed_by: { type: DataTypes.INTEGER, allowNull: true },
  reviewed_at: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'legacy_product_catalogue_links', timestamps: true });

export default LegacyProductCatalogueLink;
