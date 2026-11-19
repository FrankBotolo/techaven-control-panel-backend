import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * Ordered catalogue-device references for a promotion (primary rail/grid or secondary devices).
 * The storefront resolves these through /api/v2/marketplace/devices (refs are `device:<id>`).
 */
const PromotionDevice = sequelize.define('PromotionDevice', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  promotionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'promotion_id',
    references: { model: 'promotions', key: 'id' },
    onDelete: 'CASCADE'
  },
  deviceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'device_id',
    references: { model: 'devices', key: 'id' },
    onDelete: 'CASCADE'
  },
  role: { type: DataTypes.ENUM('primary', 'secondary'), allowNull: false, defaultValue: 'primary' },
  sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' }
}, {
  tableName: 'promotion_devices',
  timestamps: true,
  indexes: [{ unique: true, fields: ['promotion_id', 'device_id', 'role'] }]
});

export default PromotionDevice;
