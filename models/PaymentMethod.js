import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PaymentMethod = sequelize.define('PaymentMethod', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  psp_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'PSP id: 1=Airtel'
  },
  provider: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'airtel'
  },
  icon: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'payment_methods',
  timestamps: true,
  indexes: [{ fields: ['slug'] }, { fields: ['psp_id'] }]
});

export default PaymentMethod;
