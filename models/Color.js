import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Color = sequelize.define('Color', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  slug: { type: DataTypes.STRING(120), allowNull: false, unique: true },
  default_hex: { type: DataTypes.STRING(9), allowNull: true }
}, { tableName: 'colors', timestamps: true });

export default Color;
