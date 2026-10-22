import '../utils/loadEnv.js';
import db from '../models/index.js';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { enqueueDevice } from '../services/catalogue/promotionSync.js';

const hosts = {
  itel: { pages: ['itel-life.com'], images: ['itel-life.com'] },
  infinix: { pages: ['infinixmobiles.in'], images: ['infinixmobiles.in'] },
  samsung: { pages: ['samsung.com'], images: ['samsung.com'] },
  xiaomi: { pages: ['mi.com'], images: ['mi.com', 'appmifile.com'] },
  google: { pages: ['google.com', 'blog.google', 'android.com'], images: ['google.com', 'googleusercontent.com', 'gstatic.com', 'android.com'] },
  vivo: { pages: ['vivo.com'], images: ['vivo.com', 'vivoglobal.com'] },
  oppo: { pages: ['oppo.com'], images: ['oppo.com', 'oppo.net'] },
  apple: { pages: ['apple.com'], images: ['apple.com', 'cdn-apple.com'] },
  dell: { pages: ['dell.com', 'laptoparena.net'], images: ['dell.com', 'laptoparena.net'] },
  hp: { pages: ['hp.com', 'officedepot.com'], images: ['hp.com', 'www8-hp.com', 'officedepot.com'] },
  lenovo: { pages: ['lenovo.com'], images: ['lenovo.com', 'p1-ofp.static.pub', 'p2-ofp.static.pub'] },
  microsoft: { pages: ['microsoft.com'], images: ['microsoft.com', 'img-prod-cms-rt-microsoft-com.akamaized.net'] }
};
const allowed = (value, domains) => {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password && domains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
};
export function validateStockEntry(entry) {
  if (!entry.slug || !entry.model || !entry.source_page_title || !entry.match_scope) throw new Error('Exact model and source evidence required');
  const brand = hosts[entry.brand];
  if (!brand || !allowed(entry.source_page, brand.pages) || !allowed(entry.image_url, brand.images)) throw new Error('Untrusted stock-photo source');
}

async function main() {
  const args = process.argv.slice(2);
  const value = (flag) => args[args.indexOf(flag) + 1];
  if (!args.includes('--manifest')) throw new Error('--manifest is required');
  const apply = args.includes('--apply');
  const entries = JSON.parse(await readFile(value('--manifest'), 'utf8'));
  const report = { applied: apply, entries: entries.length, inserted: [], preserved: [], primary_filled: [], primary_reordered: [], errors: [] };
  try {
    await db.sequelize.authenticate();
    const processEntry = async (entry) => {
      try {
        validateStockEntry(entry);
        const device = await db.Device.findOne({ where: { slug: entry.slug }, include: [{ model: db.Brand, as: 'brand' }] });
        if (!device || device.brand.slug !== entry.brand) throw new Error('Catalogue identity mismatch');
        if(device.primary_image_url===entry.image_url&&device.source_metadata?.stock_media?.verified_at) {
          report.preserved.push(entry.slug);return;
        }
        const response = await fetch(entry.image_url, { signal: AbortSignal.timeout(20000) });
        if (!response.ok || !allowed(response.url, hosts[entry.brand].images) || !response.headers.get('content-type')?.startsWith('image/')) {
          await response.body?.cancel(); throw new Error(`Image unavailable: HTTP ${response.status}`);
        }
        if ((await response.arrayBuffer()).byteLength < 256) throw new Error('Empty image');
        const result = await db.sequelize.transaction(async (transaction) => {
          const locked = await db.Device.findByPk(device.id, { transaction, lock: transaction.LOCK.UPDATE });
          const existing = await db.DeviceMedia.findOne({ where: { device_id: device.id, media_type: 'image', device_variant_id: null, device_variant_color_id: null },
            order: [['is_primary', 'DESC'], ['sort_order', 'ASC'], ['id', 'ASC']], transaction });
          const trustedExisting = existing && allowed(existing.url, hosts[entry.brand].images);
          const url = trustedExisting ? existing.url : entry.image_url;
          const previousPrimary = locked.primary_image_url;
          const provenance = { ...entry, verified_at: new Date().toISOString(), image_url: url };
          if (apply) {
            if (!trustedExisting) await db.DeviceMedia.update({ is_primary: false }, { where: { device_id: device.id, is_primary: true }, transaction });
            if (!trustedExisting) await db.DeviceMedia.create({ device_id: device.id, url, media_type: 'image', is_primary: true, sort_order: 0, source: 'verified-stock-photo' }, { transaction });
            if (previousPrimary && previousPrimary !== url) await db.DeviceMedia.findOrCreate({
              where: { device_id: device.id, url: previousPrimary, media_type: 'image' },
              defaults: { is_primary: false, sort_order: 100, source: 'previous-catalogue-primary' }, transaction
            });
            await locked.update({ primary_image_url: url,
              source_metadata: { ...(locked.source_metadata ?? {}), stock_media: trustedExisting ?
                { ...(locked.source_metadata?.stock_media ?? {}), existing_photo_preserved: true } : provenance } }, { transaction });
            await enqueueDevice(device.id, { transaction, reason: 'stock-photo-backfill' });
          }
          return { slug: entry.slug, inserted: !trustedExisting, primary_filled: !previousPrimary,
            primary_reordered: Boolean(previousPrimary && previousPrimary !== url) };
        });
        (result.inserted ? report.inserted : report.preserved).push(entry.slug);
        if (result.primary_filled) report.primary_filled.push(entry.slug);
        if (result.primary_reordered) report.primary_reordered.push(entry.slug);
      } catch (error) { report.errors.push({ slug: entry.slug, error: error.message }); }
    };
    // Bound concurrent remote checks; each device mutation remains transactional.
    for (let index=0;index<entries.length;index+=12) await Promise.all(entries.slice(index,index+12).map(processEntry));
    if (args.includes('--report')) await writeFile(value('--report'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ applied: apply, inserted: report.inserted.length, preserved: report.preserved.length, primary_filled: report.primary_filled.length, errors: report.errors }, null, 2));
    if (report.errors.length) process.exitCode = 1;
  } finally { await db.sequelize.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
