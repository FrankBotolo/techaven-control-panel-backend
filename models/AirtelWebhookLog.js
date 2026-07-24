import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * Unconditional capture of every inbound Airtel webhook call, regardless of payload
 * shape or validity. Kept separate from AirtelTransaction (which is structured/parsed)
 * so logging never depends on the payload matching an expected shape.
 */
const AirtelWebhookLog = sequelize.define('AirtelWebhookLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  method: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  headers: {
    type: DataTypes.JSON,
    allowNull: true
  },
  body: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Parsed JSON body, when parseable'
  },
  raw_body: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    comment: 'Raw request body exactly as received, captured even when JSON parsing fails'
  },
  ip: {
    type: DataTypes.STRING(64),
    allowNull: true
  },
  note: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'e.g. JSON parse error message, invalid signature'
  }
}, {
  tableName: 'airtel_webhook_logs',
  timestamps: true,
  indexes: [
    { fields: ['createdAt'] }
  ]
});

export default AirtelWebhookLog;
