import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ShopFollow = sequelize.define('ShopFollow', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  shop_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'shops',
      key: 'id'
    }
  }
}, {
  tableName: 'shop_follows',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'shop_id']
    }
  ]
});

export default ShopFollow;
