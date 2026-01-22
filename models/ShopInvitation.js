import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ShopInvitation = sequelize.define('ShopInvitation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  shop_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'shops',
      key: 'id'
    }
  },
  owner_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  owner_email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  owner_phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'revoked', 'expired'),
    allowNull: false,
    defaultValue: 'pending'
  },
  invited_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  accepted_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'shop_invitations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default ShopInvitation;


