import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Wallet = sequelize.define('Wallet', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  balance: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'MWK'
  }
}, {
  tableName: 'wallets',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id']
    }
  ]
});

export default Wallet;

