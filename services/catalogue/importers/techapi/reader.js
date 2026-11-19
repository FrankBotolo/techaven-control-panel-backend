import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(target));
    else if (entry.isFile() && entry.name.endsWith('.json')) files.push(target);
  }
  return files.sort();
}

export async function readTechApiRecords(dataDir, filters = {}) {
  const files = await walk(dataDir);
  const records = [];
  const errors = [];
  for (const file of files) {
    const relativePath = path.relative(dataDir, file);
    const parts = relativePath.split(path.sep);
    if (filters.brand && parts[0] !== filters.brand) continue;
    if (filters.year && parts[1] !== String(filters.year)) continue;
    try {
      records.push({ file, relativePath, record: JSON.parse(await readFile(file, 'utf8')) });
    } catch (error) {
      errors.push({ relativePath, code: 'MALFORMED_JSON', message: error.message });
    }
  }
  return { records, errors };
}
