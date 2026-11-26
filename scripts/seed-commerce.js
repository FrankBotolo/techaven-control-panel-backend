/**
 * Seeds catalogue and storefront data extracted from the commerce database. Runs in one transaction.
 *
 *   node scripts/seed-commerce.js                    # dry run
 *   node scripts/seed-commerce.js --apply            # write
 *   SEED_SELLER_PASSWORD must be set to write: it is the password of the new shop owner accounts.
 *   SEED_SUBSCRIPTION_PACKAGE (slug, default growth) and SEED_SUBSCRIPTION_DAYS (default 365) set the shops' subscription.
 *   options: --database <name> (must be the DB you expect, else it aborts)
 */
import '../utils/loadEnv.js';
import { seedCommerce } from './seeders/commerce.js';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const expected = args.includes('--database') ? args[args.indexOf('--database') + 1] : null;

const { default: db } = await import('../models/index.js');
db.sequelize.options.logging = false;
try {
  const mediaBase = (process.env.PUBLIC_API_BASE_URL || process.env.APP_URL || '').replace(/\/$/, '');
  if (!/^https?:\/\//.test(mediaBase)) throw new Error('Set PUBLIC_API_BASE_URL or APP_URL');
  await db.sequelize.authenticate();
  const [[{ name: database }]] = await db.sequelize.query('SELECT DATABASE() AS name');
  if (args.includes('--database') && expected !== database) throw new Error(`Connected to ${database}, expected ${expected}`);
  const sellerPassword = process.env.SEED_SELLER_PASSWORD;
  const subscription = { package: process.env.SEED_SUBSCRIPTION_PACKAGE || 'growth', days: Number(process.env.SEED_SUBSCRIPTION_DAYS || 365) };
  if (!(subscription.days > 0)) throw new Error('SEED_SUBSCRIPTION_DAYS must be a positive number');
  const run = (transaction) => seedCommerce(db, { mediaBase, sellerPassword, subscription, transaction, apply });
  const tables = apply ? await db.sequelize.transaction(run) : await run(undefined);
  console.log(JSON.stringify({ mode: apply ? 'applied' : 'dry-run (pass --apply to write)', database, tables }, null, 2));
  if (apply) console.log('Run "npm run catalog:backfill-promotions" if the promotions CMS should see the new devices and shops.');
} catch (error) {
  console.error('Commerce seed failed:', error.message);
  process.exitCode = 1;
} finally {
  await db.sequelize.close();
}
