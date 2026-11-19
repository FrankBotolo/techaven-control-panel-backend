import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

/** Ordered shop references for a promotion (e.g. shop rails). */
const PromotionShop = sequelize.define('PromotionShop', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  promotionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'promotion_id',
    references: { model: 'promotions', key: 'id' },
    onDelete: 'CASCADE'
  },
  shopId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'shop_id',
    references: { model: 'shops', key: 'id' },
    onDelete: 'CASCADE'
  },
  sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' }
}, {
  tableName: 'promotion_shops',
  timestamps: true,
  indexes: [{ unique: true, fields: ['promotion_id', 'shop_id'] }]
});

export default PromotionShop;
