import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Shop = sequelize.define('Shop', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: false,
    defaultValue: 'active'
  },
  logo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  application_status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'approved'
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  business_license_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  verification_documents: {
    type: DataTypes.JSON,
    allowNull: true
  },
  joined_date: {
    type: DataTypes.STRING,
    allowNull: true
  },
  total_products: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_sales: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'shops',
  timestamps: true
});

export default Shop;

