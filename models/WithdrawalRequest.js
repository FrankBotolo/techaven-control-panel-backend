import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const WithdrawalRequest = sequelize.define('WithdrawalRequest', {
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
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  withdrawal_method: {
    type: DataTypes.ENUM('mobile_money', 'bank_transfer'),
    allowNull: false,
    defaultValue: 'mobile_money'
  },
  account_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  account_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  admin_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  processed_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  processed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'withdrawal_requests',
  timestamps: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['status'] },
    { fields: ['createdAt'] }
  ]
});

export default WithdrawalRequest;
