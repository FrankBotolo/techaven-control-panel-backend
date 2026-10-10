import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ListingImage = sequelize.define('ListingImage', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  listing_id: { type: DataTypes.INTEGER, allowNull: false },
  storage_key: { type: DataTypes.STRING(500), allowNull: true },
  url: { type: DataTypes.TEXT, allowNull: true },
  alt_text: { type: DataTypes.STRING(255), allowNull: true },
  sort_order: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  is_primary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, { tableName: 'listing_images', timestamps: true });

export default ListingImage;
