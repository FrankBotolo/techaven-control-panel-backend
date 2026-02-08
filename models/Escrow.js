import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Escrow = sequelize.define('Escrow', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'orders',
      key: 'id'
    }
  },
  seller_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'MWK'
  },
  status: {
    type: DataTypes.ENUM('pending', 'held', 'released', 'refunded'),
    allowNull: false,
    defaultValue: 'pending'
  },
  held_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  released_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  refunded_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'escrows',
  timestamps: true,
  indexes: [
    {
      fields: ['order_id']
    },
    {
      fields: ['seller_id']
    },
    {
      fields: ['status']
    }
  ]
});

export default Escrow;

