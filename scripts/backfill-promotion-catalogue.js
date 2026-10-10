import '../utils/loadEnv.js';
import db from '../models/index.js';
import { enqueueDevice, enqueueShop } from '../services/catalogue/promotionSync.js';

const { Device, Shop, sequelize } = db;
try {
  await sequelize.authenticate();
  const devices = await Device.findAll({ attributes: ['id', 'updatedAt'], order: [['id', 'ASC']] });
  const shops = await Shop.findAll({ attributes: ['id', 'updatedAt'], order: [['id', 'ASC']] });
  for (const device of devices) await enqueueDevice(device.id, { reason: `backfill:${device.updatedAt.toISOString()}` });
  for (const shop of shops) await enqueueShop(shop.id, { reason: `backfill:${shop.updatedAt.toISOString()}` });
  console.log(JSON.stringify({ devices: devices.length, shops: shops.length }));
} finally {
  await sequelize.close();
}
