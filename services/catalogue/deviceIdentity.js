import db from '../../models/index.js';

export async function resolveDeviceIdentity(identifier, transaction) {
  const where = /^\d+$/.test(String(identifier)) ? { id: Number(identifier) } : { slug: identifier };
  const options = { transaction, ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}) };
  let device = await db.Device.findOne({ where, ...options });
  const visited = new Set();
  while (device?.canonical_device_id) {
    if (visited.has(device.id)) throw new Error('Circular catalog alias');
    visited.add(device.id);
    device = await db.Device.findByPk(device.canonical_device_id, options);
  }
  return device;
}
