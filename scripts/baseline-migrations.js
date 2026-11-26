/**
 * Records the early catalogue migrations as applied on a database whose tables were already
 * created from the models (bootstrap-database.js / sequelize.sync). Those migrations use plain
 * CREATE TABLE / ALTER TABLE, so `migrate:v2` otherwise stops with "Table 'brands' already exists".
 *
 * A migration is recorded only when every table and column it creates is present. Nothing else
 * is changed. If anything is missing it is listed and nothing is recorded.
 *
 *   node scripts/baseline-migrations.js           # dry run
 *   node scripts/baseline-migrations.js --apply   # record, then run `npm run migrate:v2`
 */
import '../utils/loadEnv.js';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export const BASELINE = {
  '202610100001-create-catalogue.js': { brands: [], devices: [], device_variants: [], colors: [], device_variant_colors: [], device_media: [] },
  '202610100002-create-seller-listings.js': { seller_listings: [], listing_images: [], catalogue_product_requests: [] },
  '202610100003-add-listing-commerce.js': {
    carts: ['seller_listing_id'], order_items: ['seller_listing_id', 'canonical_snapshot', 'listing_snapshot']
  },
  '202610100004-create-legacy-catalogue-links.js': { legacy_product_catalogue_links: [] },
  '202610100005-create-promotion-catalogue-events.js': { promotion_catalogue_events: [] }
};

/** @returns {{ record: string[], missing: Record<string, string[]>, applied: string[] }} */
export async function planBaseline(sequelize) {
  const query = sequelize.getQueryInterface();
  const [ledger] = await sequelize.query(
    "SELECT name FROM schema_migrations WHERE name IN (?)", { replacements: [Object.keys(BASELINE)] }
  ).catch(() => [[]]);
  const applied = ledger.map((row) => row.name);
  const tables = new Set((await query.showAllTables()).map((name) => String(name).toLowerCase()));
  const record = [];
  const missing = {};
  for (const [migration, required] of Object.entries(BASELINE)) {
    if (applied.includes(migration)) continue;
    const absent = [];
    for (const [table, columns] of Object.entries(required)) {
      if (!tables.has(table)) { absent.push(table); continue; }
      const described = await query.describeTable(table);
      for (const column of columns) if (!described[column]) absent.push(`${table}.${column}`);
    }
    if (absent.length) missing[migration] = absent;
    else record.push(migration);
  }
  return { record, missing, applied };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const { default: sequelize } = await import('../config/database.js');
  sequelize.options.logging = false;
  try {
    await sequelize.authenticate();
    const [[{ name: database }]] = await sequelize.query('SELECT DATABASE() AS name');
    await sequelize.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) PRIMARY KEY, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB`);
    const plan = await planBaseline(sequelize);
    const blocked = Object.keys(plan.missing).length > 0;
    if (apply && !blocked && plan.record.length) {
      await sequelize.query(`INSERT INTO schema_migrations (name) VALUES ${plan.record.map(() => '(?)').join(', ')}`,
        { replacements: plan.record });
    }
    console.log(JSON.stringify({
      mode: apply ? (blocked ? 'not applied: schema incomplete' : 'applied') : 'dry-run (pass --apply to record)',
      database, already_recorded: plan.applied, [apply && !blocked ? 'recorded' : 'would_record']: plan.record, missing: plan.missing
    }, null, 2));
    if (blocked) {
      console.log('Some tables or columns are missing. Run `DB_BOOTSTRAP=true node scripts/bootstrap-database.js` and check again.');
      process.exitCode = 1;
    } else if (apply) console.log('Now run: npm run migrate:v2');
  } finally {
    await sequelize.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => { console.error('Baseline failed:', error.message); process.exitCode = 1; });
}
