import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  shop_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'shops',
      key: 'id'
    }
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  image: {
    type: DataTypes.STRING,
    allowNull: false
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  original_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  discount: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0
  },
  total_reviews: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_hot: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_special: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // Temporarily commented out until migration is run
  // Uncomment after running: database/migrations/add_is_new_arrival_to_products.sql
  // is_new_arrival: {
  //   type: DataTypes.BOOLEAN,
  //   defaultValue: false
  // },
  vendor: {
    type: DataTypes.STRING,
    allowNull: true
  },
  specifications: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null
  }
}, {
  tableName: 'products',
  timestamps: true
});

export default Product;

