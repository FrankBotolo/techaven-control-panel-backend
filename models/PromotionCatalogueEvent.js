import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PromotionCatalogueEvent = sequelize.define('PromotionCatalogueEvent', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  kind: { type: DataTypes.ENUM('device', 'shop'), allowNull: false },
  external_id: { type: DataTypes.STRING(255), allowNull: false },
  payload: { type: DataTypes.JSON, allowNull: false },
  dedupe_key: { type: DataTypes.STRING(255), allowNull: false, unique: true }
}, { tableName: 'promotion_catalogue_events', timestamps: true, updatedAt: false });

export default PromotionCatalogueEvent;
