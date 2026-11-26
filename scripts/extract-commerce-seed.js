/**
 * Extracts seed data from a mysqldump of the commerce database into scripts/data/commerce/*.ndjson.gz
 * (one JSON row per line, read by scripts/seeders/commerce.js). Reads only the dump, never a database.
 *
 *   node scripts/extract-commerce-seed.js <path to commerce.sql>
 *
 * Only the tables below are extracted. Customer accounts, orders, sessions, OTPs, logs and other
 * private or runtime tables are deliberately left out because the output is committed.
 */
import { createReadStream, mkdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

export const SEED_TABLES = [
  'platform_settings', 'categories', 'brands', 'devices', 'device_variants', 'device_media',
  'shops', 'seller_listings', 'seller_listing_categories', 'listing_images'
];
const outDir = fileURLToPath(new URL('./data/commerce/', import.meta.url));
const ESCAPES = { n: '\n', r: '\r', t: '\t', 0: '\0', b: '\b', Z: '\x1a' };

/** Parses "(1,'a',NULL),(2,...);" into arrays of strings, numbers and nulls. */
export function parseValues(text, start = 0) {
  const rows = [];
  let i = start;
  const fail = () => { throw new Error(`Unexpected SQL at ${i}: ${text.slice(i, i + 60)}`); };
  for (;;) {
    if (text[i] !== '(') fail();
    i++;
    const row = [];
    for (;;) {
      if (text[i] === "'") {
        let value = '';
        let from = ++i;
        for (;;) {
          const c = text[i];
          if (c === undefined) fail();
          if (c === '\\') {
            const next = text[i + 1];
            value += text.slice(from, i) + (ESCAPES[next] ?? next);
            i += 2;
            from = i;
          } else if (c === "'") {
            value += text.slice(from, i);
            if (text[i + 1] !== "'") { i++; break; }
            value += "'";
            i += 2;
            from = i;
          } else i++;
        }
        row.push(value);
      } else {
        const from = i;
        while (i < text.length && text[i] !== ',' && text[i] !== ')') i++;
        const token = text.slice(from, i);
        if (token === 'NULL') row.push(null);
        else if (/^-?\d+(\.\d+)?$/.test(token)) row.push(Number(token));
        else { i = from; fail(); }
      }
      if (text[i] === ',') { i++; continue; }
      if (text[i] === ')') { i++; break; }
      fail();
    }
    rows.push(row);
    if (text[i] === ',') { i++; continue; }
    if (text[i] === ';') return rows;
    fail();
  }
}

export function convertRow(columns, values) {
  if (columns.length !== values.length) throw new Error(`Expected ${columns.length} values, found ${values.length}`);
  return Object.fromEntries(columns.map(({ name, type }, i) => {
    const value = values[i];
    if (value === null) return [name, null];
    if (type === 'json') return [name, JSON.parse(value)];
    if (type === 'tinyint(1)') return [name, Boolean(value)];
    if (type === 'datetime') return [name, `${value.replace(' ', 'T')}Z`]; // dumps are written in UTC
    return [name, value];
  }));
}

async function main() {
  const dump = process.argv[2];
  if (!dump) throw new Error('Usage: node scripts/extract-commerce-seed.js <path to commerce.sql>');
  const columns = {};
  const rows = Object.fromEntries(SEED_TABLES.map((table) => [table, []]));
  let creating = null;
  for await (const line of createInterface({ input: createReadStream(dump, 'utf8'), crlfDelay: Infinity })) {
    const create = /^CREATE TABLE `(\w+)`/.exec(line);
    if (create) {
      creating = create[1];
      columns[creating] = [];
    } else if (creating) {
      const column = /^\s+`(\w+)` ([^\s,]+)/.exec(line);
      if (column) columns[creating].push({ name: column[1], type: column[2] });
      if (line.startsWith(')')) creating = null;
    } else {
      const insert = /^INSERT INTO `(\w+)` VALUES /.exec(line);
      if (!insert || !rows[insert[1]]) continue;
      for (const values of parseValues(line, insert[0].length)) rows[insert[1]].push(convertRow(columns[insert[1]], values));
    }
  }
  for (const table of SEED_TABLES) if (!columns[table]) throw new Error(`Table ${table} is missing from the dump`);
  mkdirSync(outDir, { recursive: true });
  for (const table of SEED_TABLES) {
    const text = rows[table].map((row) => `${JSON.stringify(row)}\n`).join('');
    writeFileSync(path.join(outDir, `${table}.ndjson.gz`), gzipSync(text, { level: 9 }));
  }
  console.log(JSON.stringify(Object.fromEntries(SEED_TABLES.map((table) => [table, rows[table].length])), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => { console.error('Extract failed:', error.message); process.exitCode = 1; });
}
