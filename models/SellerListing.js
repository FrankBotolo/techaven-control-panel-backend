import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export function listingIdentity(listing) {
  return listing.status === 'active'
    ? `${listing.shop_id}:${listing.device_variant_id}:${listing.device_variant_color_id || 0}:${listing.condition}`
    : null;
}

function deriveListingFields(listing) {
  listing.currency = String(listing.currency || 'MWK').toUpperCase();
  listing.active_identity = listingIdentity(listing);
  if (listing.status === 'active' && !listing.published_at) listing.published_at = new Date();
}

const SellerListing = sequelize.define('SellerListing', {
  details: { type: DataTypes.JSON, allowNull: true },
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shop_id: { type: DataTypes.INTEGER, allowNull: false },
  device_variant_id: { type: DataTypes.INTEGER, allowNull: false },
  device_variant_color_id: { type: DataTypes.INTEGER, allowNull: true },
  merchant_sku: { type: DataTypes.STRING(180), allowNull: true },
  condition: { type: DataTypes.ENUM('new', 'used', 'refurbished', 'open_box'), allowNull: false },
  currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'MWK' },
  price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, validate: { min: 0.01 } },
  quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  warranty_months: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  status: { type: DataTypes.ENUM('draft', 'active', 'paused', 'archived'), allowNull: false, defaultValue: 'draft' },
  active_identity: { type: DataTypes.STRING(500), allowNull: true, unique: true },
  published_at: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'seller_listings', timestamps: true,
  indexes: [{ unique: true, fields: ['shop_id', 'merchant_sku'] }],
  hooks: {
    // Derive in beforeSave only: save() fixes its column list before validation, and a field first
    // changed in beforeValidate is then ignored, so clearing active_identity on archive never persisted
    // (re-listing the same device + condition hit DUPLICATE_LISTING forever). beforeSave changes are saved.
    beforeSave: deriveListingFields
  }
});

export default SellerListing;
