import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Dispute = sequelize.define('Dispute', {
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
  buyer_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
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
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('open', 'in_review', 'resolved'),
    allowNull: false,
    defaultValue: 'open'
  },
  resolution_type: {
    type: DataTypes.ENUM('refund_buyer', 'pay_seller', 'partial', 'replacement'),
    allowNull: true
  },
  refund_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  seller_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  admin_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  resolved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  evidence: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'disputes',
  timestamps: true,
  indexes: [
    { fields: ['order_id'] },
    { fields: ['buyer_id'] },
    { fields: ['seller_id'] },
    { fields: ['status'] }
  ]
});

export default Dispute;
