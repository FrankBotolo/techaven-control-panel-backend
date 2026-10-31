import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import db from '../models/index.js';
import { enqueueDevice } from '../services/catalogue/promotionSync.js';

const sourceHosts = {
  apple: ['apple.com'], samsung: ['samsung.com'],
  google: ['google.com', 'blog.google', 'android.com'], xiaomi: ['mi.com'],
};
const imageHosts = {
  apple: ['apple.com'], samsung: ['samsung.com'],
  google: ['google.com', 'googleusercontent.com', 'gstatic.com', 'android.com'],
  xiaomi: ['mi.com', 'appmifile.com'],
};
function matchesHost(url, hosts) {
  const parsed = new URL(url);
  return parsed.protocol === 'https:' && !parsed.username && !parsed.password
    && hosts.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
}

export function validateMediaEntry(entry) {
  if (!Number.isInteger(entry.device_id) || entry.device_id <= 0 || !entry.device_slug || !entry.model) {
    throw new Error('Each image needs an exact device identity and verified model');
  }
  if (!sourceHosts[entry.brand] || !matchesHost(entry.source_page, sourceHosts[entry.brand])
    || !matchesHost(entry.image_url, imageHosts[entry.brand])) {
    throw new Error(`Manufacturer source required for ${entry.device_slug}`);
  }
}

export async function backfillMedia(entries, { apply = false, verifyImages = true } = {}) {
  const report = { applied: apply, total: entries.length, inserted: [], skipped: [], errors: [] };
  const ids = new Set();
  for (const entry of entries) {
    try {
      validateMediaEntry(entry);
      if (ids.has(entry.device_id)) throw new Error(`Duplicate device ${entry.device_id}`);
      ids.add(entry.device_id);
      const device = await db.Device.findByPk(entry.device_id, { include: [{ model: db.Brand, as: 'brand' }] });
      if (!device || device.slug !== entry.device_slug || device.brand?.slug !== entry.brand) {
        throw new Error('Manifest identity does not match the catalogue');
      }
      if (device.primary_image_url || await db.DeviceMedia.count({ where: {
        device_id: device.id, media_type: 'image', device_variant_id: null, device_variant_color_id: null,
      } })) {
        report.skipped.push({ device_id: device.id, reason: 'Existing device image preserved' });
        continue;
      }
      if (verifyImages) {
        const response = await fetch(entry.image_url, { signal: AbortSignal.timeout(20000) });
        if (!response.ok || !matchesHost(response.url, imageHosts[entry.brand])
          || !response.headers.get('content-type')?.startsWith('image/')) {
          await response.body?.cancel();
          throw new Error(`Image unavailable (HTTP ${response.status})`);
        }
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength < 256) throw new Error('Empty or invalid image');
      }
      if (apply) {
        const created = await db.sequelize.transaction(async (transaction) => {
          const locked = await db.Device.findByPk(device.id, { transaction, lock: transaction.LOCK.UPDATE });
          if (locked.primary_image_url || await db.DeviceMedia.count({ where: {
            device_id: device.id, media_type: 'image', device_variant_id: null, device_variant_color_id: null,
          }, transaction })) return false;
          await db.DeviceMedia.create({ device_id: device.id, url: entry.image_url,
            media_type: 'image', is_primary: true, sort_order: 0,
            source: 'manufacturer-media-backfill', storage_key: null }, { transaction });
          await locked.update({ source_metadata: { ...(locked.source_metadata ?? {}),
            manufacturer_media: { source_page: entry.source_page, image_url: entry.image_url,
              model: entry.model, verified_at: entry.verified_at } } }, { transaction });
          await enqueueDevice(device.id, { transaction, reason: `manufacturer-media:${device.id}` });
          return true;
        });
        if (!created) {
          report.skipped.push({ device_id: device.id, reason: 'Existing device image preserved' });
          continue;
        }
      }
      report.inserted.push({ device_id: device.id, model: entry.model, image_url: entry.image_url,
        source_page: entry.source_page });
    } catch (error) {
      report.errors.push({ device_id: entry.device_id, error: error.message });
    }
  }
  return report;
}

async function main() {
  const args = process.argv.slice(2);
  const value = (flag) => args[args.indexOf(flag) + 1];
  if (!args.includes('--manifest')) throw new Error('Usage: node scripts/backfill-device-media.js --manifest <file> [--apply] [--report <file>]');
  try {
    await db.sequelize.authenticate();
    const manifest = JSON.parse(await readFile(path.resolve(value('--manifest')), 'utf8'));
    const report = await backfillMedia(manifest.images ?? manifest, { apply: args.includes('--apply') });
    const output = `${JSON.stringify(report, null, 2)}\n`;
    if (args.includes('--report')) await writeFile(path.resolve(value('--report')), output);
    console.log(JSON.stringify({ applied: report.applied, total: report.total, inserted: report.inserted.length,
      skipped: report.skipped.length, errors: report.errors }, null, 2));
    if (report.errors.length) process.exitCode = 2;
  } finally { await db.sequelize.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
