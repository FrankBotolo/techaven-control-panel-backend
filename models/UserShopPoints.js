import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

/** Per-shop point balance for buyers (shop_id 0 = legacy / unallocated pool). */
const UserShopPoints = sequelize.define(
  'UserShopPoints',
  {
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
      defaultValue: 0,
      comment: '0 = legacy bucket; otherwise matches shops.id'
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  },
  {
    tableName: 'user_shop_points',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'shop_id']
      }
    ]
  }
);

export default UserShopPoints;
