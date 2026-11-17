import { QueryTypes } from 'sequelize';
import db from '../models/index.js';
import { resolveDeviceIdentity } from '../services/catalogue/deviceIdentity.js';

export async function getDeviceFavorites(userId) {
  return db.sequelize.query(`
    SELECT d.id AS device_id, d.slug AS device_slug, f.created_at AS added_at
    FROM device_favorites f JOIN devices d ON d.id = f.device_id
    WHERE f.user_id = :userId ORDER BY f.created_at DESC
  `, { replacements: { userId }, type: QueryTypes.SELECT });
}

export async function updateDeviceFavorite(req, res, next) {
  try {
    const identifier = req.body?.device_id ?? req.params.deviceId;
    if (!/^\d+$/.test(String(identifier)) || Number(identifier) < 1) {
      return res.status(400).json({ success: false, message: 'Valid device ID required' });
    }
    const userId = req.user.id;
    const updated = await db.sequelize.transaction(async (transaction) => {
      const device = await resolveDeviceIdentity(identifier, transaction);
      if (!device?.is_active) return false;
      const options = { replacements: { userId, deviceId: device.id }, transaction };
      if (req.method === 'DELETE') {
        await db.sequelize.query('DELETE FROM device_favorites WHERE user_id = :userId AND device_id = :deviceId', options);
      } else {
        await db.sequelize.query(`
          INSERT INTO device_favorites (user_id, device_id) VALUES (:userId, :deviceId)
          ON DUPLICATE KEY UPDATE device_id = device_id
        `, options);
      }
      return true;
    });
    if (!updated) return res.status(404).json({ success: false, message: 'Device not found' });
    return res.json({ success: true, data: {} });
  } catch (error) {
    return next(error);
  }
}
