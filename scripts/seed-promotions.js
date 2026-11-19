/**
 * Standalone promotions seeder: `npm run seed:promotions`
 * Safe to re-run; only refreshes records still owned by the starter marker.
 */
import '../utils/loadEnv.js';
import db from '../models/index.js';
import { seedPromotions } from './seeders/promotions.js';

try {
  await db.sequelize.authenticate();
  // Create promotion tables if this database predates them.
  await db.Promotion.sync();
  await db.PromotionDevice.sync();
  await db.PromotionShop.sync();
  console.log('─── Promotions (merchandising) ───\n');
  const counts = await seedPromotions();
  await db.sequelize.close();
  process.exit(counts.failed ? 1 : 0);
} catch (error) {
  console.error('❌ Promotion seeding failed:', error);
  process.exit(1);
}
