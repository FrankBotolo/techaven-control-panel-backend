import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DeliveryJob = sequelize.define('DeliveryJob', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'orders', key: 'id' }
  },
  agent_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'delivery_agents', key: 'id' }
  },
  pickup_address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  dropoff_address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  parcel_summary: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  delivery_fee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('pending', 'assigned', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'declined'),
    allowNull: false,
    defaultValue: 'pending'
  },
  accepted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  picked_up_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  delivered_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'delivery_jobs',
  timestamps: true
});

export default DeliveryJob;
