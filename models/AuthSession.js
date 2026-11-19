import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const AuthSession = sequelize.define('AuthSession', {
  id: { type: DataTypes.UUID, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  revoked_at: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'auth_v2_sessions', timestamps: true });

export const AuthRefreshToken = sequelize.define('AuthRefreshToken', {
  hash: { type: DataTypes.STRING(64), primaryKey: true },
  session_id: { type: DataTypes.UUID, allowNull: false },
  used_at: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'auth_v2_refresh_tokens', timestamps: true });

export const AuthChallenge = sequelize.define('AuthChallenge', {
  id: { type: DataTypes.UUID, primaryKey: true },
  type: { type: DataTypes.STRING(30), allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: true },
  identifier: { type: DataTypes.STRING, allowNull: true },
  secret_hash: { type: DataTypes.STRING(64), allowNull: false },
  data: { type: DataTypes.JSON, allowNull: true },
  attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  consumed_at: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'auth_v2_challenges', timestamps: true });

export const AuthRateLimit = sequelize.define('AuthRateLimit', {
  key: { type: DataTypes.STRING(64), primaryKey: true },
  count: { type: DataTypes.INTEGER, allowNull: false },
  expires_at: { type: DataTypes.DATE, allowNull: false }
}, { tableName: 'auth_v2_rate_limits', timestamps: false });
