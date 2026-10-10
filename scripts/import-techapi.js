import '../utils/loadEnv.js';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import db from '../models/index.js';
import { readTechApiRecords } from '../services/catalogue/importers/techapi/reader.js';
import { importTechApi } from '../services/catalogue/importers/techapi/importer.js';

const args = process.argv.slice(2);
const value = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const dataDir = value('--data-dir');
const categoryId = Number(value('--category-id'));
const dryRun = args.includes('--dry-run');
const reportPath = value('--report');

if (!dataDir || !categoryId) {
  console.error('Usage: node scripts/import-techapi.js --data-dir <smartphone-dir> --category-id <id> [--brand slug] [--year YYYY] [--dry-run] [--report file]');
  process.exit(1);
}

let sourceRevision = value('--source-revision');
if (!sourceRevision) {
  try { sourceRevision = execFileSync('git', ['-C', path.resolve(dataDir), 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { sourceRevision = null; }
}

try {
  if (!dryRun) await db.sequelize.authenticate();
  const { records, errors } = await readTechApiRecords(path.resolve(dataDir), { brand: value('--brand'), year: value('--year') });
  const report = await importTechApi({ records, readErrors: errors, categoryId, sourceRevision, dryRun });
  const output = JSON.stringify({ ...report, dry_run: dryRun, source_revision: sourceRevision }, null, 2);
  if (reportPath) await writeFile(reportPath, `${output}\n`, 'utf8');
  console.log(output);
  if (report.errors.length) process.exitCode = 2;
} finally {
  await db.sequelize.close();
}
