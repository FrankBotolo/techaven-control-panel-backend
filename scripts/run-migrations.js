import '../utils/loadEnv.js';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sequelize from '../config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '..', 'database', 'migrations-js');
const command = process.argv[2] || 'status';
const dryRun = process.argv.includes('--dry-run');

if (!['up', 'down', 'status'].includes(command)) {
  console.error('Usage: node scripts/run-migrations.js <up|down|status> [--dry-run]');
  process.exit(1);
}

async function ensureMigrationsTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
}

async function loadMigrations() {
  const files = (await readdir(migrationsDir))
    .filter((file) => /^\d+.*\.js$/.test(file))
    .sort();
  return Promise.all(files.map(async (file) => ({
    name: file,
    module: await import(pathToFileURL(path.join(migrationsDir, file)).href)
  })));
}

async function appliedNames() {
  const [rows] = await sequelize.query('SELECT name FROM schema_migrations ORDER BY name');
  return new Set(rows.map((row) => row.name));
}

async function main() {
  await sequelize.authenticate();
  await ensureMigrationsTable();
  const migrations = await loadMigrations();
  const applied = await appliedNames();

  if (command === 'status') {
    migrations.forEach(({ name }) => console.log(`${applied.has(name) ? 'up' : 'down'}\t${name}`));
    return;
  }

  if (command === 'up') {
    for (const migration of migrations) {
      if (applied.has(migration.name)) continue;
      if (dryRun) {
        console.log(`would apply\t${migration.name}`);
        continue;
      }
      const transaction = await sequelize.transaction();
      try {
        await migration.module.up({ sequelize, queryInterface: sequelize.getQueryInterface(), transaction });
        await sequelize.query('INSERT INTO schema_migrations (name) VALUES (?)', {
          replacements: [migration.name], transaction
        });
        await transaction.commit();
        console.log(`applied\t${migration.name}`);
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    }
    return;
  }

  const migration = [...migrations].reverse().find(({ name }) => applied.has(name));
  if (!migration) {
    console.log('No applied migrations to roll back.');
    return;
  }
  if (dryRun) {
    console.log(`would revert\t${migration.name}`);
    return;
  }
  const transaction = await sequelize.transaction();
  try {
    await migration.module.down({ sequelize, queryInterface: sequelize.getQueryInterface(), transaction });
    await sequelize.query('DELETE FROM schema_migrations WHERE name = ?', {
      replacements: [migration.name], transaction
    });
    await transaction.commit();
    console.log(`reverted\t${migration.name}`);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

main()
  .catch((error) => {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
