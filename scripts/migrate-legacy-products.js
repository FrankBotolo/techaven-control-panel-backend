import '../utils/loadEnv.js';
import { writeFile } from 'node:fs/promises';
import db from '../models/index.js';
import { migrateLegacyProducts } from '../services/catalogue/legacyMigration.js';

const args = process.argv.slice(2);
const value = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const dryRun = args.includes('--dry-run');

try {
  await db.sequelize.authenticate();
  const report = await migrateLegacyProducts({ dryRun, limit: Math.min(Number(value('--batch-size')) || 100, 1000) });
  const output = JSON.stringify({ ...report, dry_run: dryRun }, null, 2);
  if (value('--report')) await writeFile(value('--report'), `${output}\n`, 'utf8');
  console.log(output);
  if (report.errors.length) process.exitCode = 2;
} finally {
  await db.sequelize.close();
}
