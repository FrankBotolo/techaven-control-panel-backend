import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Order = sequelize.define('Order', {
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
  order_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  shipping_address_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'shipping_addresses', key: 'id' }
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  shipping_fee: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  total_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  shipping_address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  shipping_city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  shipping_phone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  payment_method: {
    type: DataTypes.STRING,
    allowNull: true
  },
  payment_status: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
    allowNull: false,
    defaultValue: 'pending'
  },
  courier_service: {
    type: DataTypes.STRING,
    allowNull: true
  },
  courier_tracking_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  seller_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  escrow_status: {
    type: DataTypes.ENUM('pending', 'held', 'released', 'refunded'),
    allowNull: false,
    defaultValue: 'pending'
  },
  escrow_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  delivery_confirmed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  funds_released_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'orders',
  timestamps: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['order_number']
    },
    {
      fields: ['status']
    }
  ]
});

export default Order;










