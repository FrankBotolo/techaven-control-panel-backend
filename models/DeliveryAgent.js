import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DeliveryAgent = sequelize.define('DeliveryAgent', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: { model: 'users', key: 'id' }
  },
  vehicle_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  operating_zone: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  id_document_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  is_available: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  decline_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'delivery_agents',
  timestamps: true
});

export default DeliveryAgent;
