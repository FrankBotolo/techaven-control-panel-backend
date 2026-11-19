import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export default sequelize.define('CustomerPaymentMethod', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
  type: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'mobile_money' },
  provider: { type: DataTypes.STRING(50), allowNull: false },
  phone_number: { type: DataTypes.STRING(20), allowNull: false },
  is_default: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'customer_payment_methods', indexes: [{ unique: true, fields: ['user_id', 'provider', 'phone_number'] }] });
