import '../utils/loadEnv.js';
import sequelize from '../config/database.js';
import { cleanupAuth } from '../services/auth/challenges.js';

try {
  await cleanupAuth();
  console.log('Expired auth v2 records cleaned up; active sessions and reuse detection retained.');
} catch (error) {
  console.error('Auth v2 cleanup failed:', error.name);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
