/**
 * Seeds every device, its variants and its photo from scripts/data/device-catalogue.json.gz.
 * Add-only and idempotent: existing brands, devices, variants and photos are never changed,
 * so admin edits and the curated seed:variants rows win. Runs in one transaction.
 *
 *   node scripts/seed-device-catalogue.js                       # dry run
 *   node scripts/seed-device-catalogue.js --apply               # write
 *   options: --since 2018  --brands samsung,tecno  --categories Smartphones,Tablets
 *            --with-images-only  --database <name> (must be the DB you expect, else it aborts)
 *
 * Photos come from uploads/devices (see download-device-images.js) and are stored as
 * <PUBLIC_API_BASE_URL>/uploads/devices/<file>. Move them later with rewrite-media-origins.js.
 */
import '../utils/loadEnv.js';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { canonicalVariantKey } from '../services/catalogue/normalization.js';
import { modelKey } from '../services/catalogue/deviceIdentity.js';

const uploadsDir = fileURLToPath(new URL('../uploads/devices/', import.meta.url));
const storageLabel = (gb) => (gb >= 1024 && gb % 1024 === 0 ? `${gb / 1024}TB` : `${gb}GB`);
const variantLabel = (ram, storage) => [ram && `${ram}GB RAM`, storage && storageLabel(storage)].filter(Boolean).join(' · ') || 'Standard';
const chunk = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

export function selectDevices(devices, { since, brands, categories, imagesOnly, images = {} } = {}) {
  return devices.filter((device) => (!since || (device.release_date ?? '') >= since)
    && (!brands || brands.includes(device.brand))
    && (!categories || categories.includes(device.category))
    && (!imagesOnly || images[device.slug]));
}

export const catalogueVariantKey = (slug, network, variant) =>
  [canonicalVariantKey(slug, { ram_gb: variant.ram, storage_gb: variant.storage, network_generation: network }), variant.fingerprint]
    .filter(Boolean).join('|');

export async function seedCatalogue(db, { manifest, devices, images, mediaBase, transaction, apply }) {
  const created = { categories: 0, brands: 0, devices: 0, variants: 0, media: 0 };
  const reused = { devices: 0 };
  const changedDeviceIds = new Set();
  const opts = { transaction };
  const provenance = { provider: 'TechAPI', attribution: manifest.attribution, source_revision: manifest.revision };
  const insert = async (model, rows, counter) => {
    created[counter] += rows.length;
    if (apply) for (const part of chunk(rows, 500)) await model.bulkCreate(part, { ...opts, validate: false });
  };

  const categoryIds = new Map();
  for (const name of new Set(devices.map((device) => device.category))) {
    let category = await db.Category.findOne({ where: { name, shop_id: null, status: 'approved' }, ...opts });
    if (!category) {
      created.categories++;
      if (apply) category = await db.Category.create({ name, description: `${name} from leading brands`, status: 'approved', shop_id: null }, opts);
    }
    categoryIds.set(name, category?.id ?? null);
  }

  const wantedBrands = new Set(devices.map((device) => device.brand));
  const haveBrands = new Set((await db.Brand.findAll({ attributes: ['slug'], raw: true, ...opts })).map((row) => row.slug));
  await insert(db.Brand, manifest.brands.filter((brand) => wantedBrands.has(brand.slug) && !haveBrands.has(brand.slug))
    .map((brand) => ({ ...brand, is_active: true, source_metadata: provenance })), 'brands');
  const brandRows = await db.Brand.findAll({ attributes: ['id', 'slug'], raw: true, ...opts });
  const brandIds = new Map(brandRows.map((row) => [row.slug, row.id]));
  const brandSlugs = new Map(brandRows.map((row) => [row.id, row.slug]));

  // A device already in the catalogue may use another slug scheme ("galaxy-s24"), so also match brand + model.
  const loadDevices = async () => {
    const bySlug = new Map();
    const byModel = new Map();
    for (const row of await db.Device.findAll({ attributes: ['id', 'slug', 'name', 'brand_id', 'category_id', 'primary_image_url'], raw: true, ...opts })) {
      bySlug.set(row.slug, row);
      const brand = brandSlugs.get(row.brand_id);
      const key = `${brand}|${row.category_id}|${modelKey(brand ?? '', row.name)}`;
      if (!byModel.has(key)) byModel.set(key, row);
    }
    return (device) => {
      const model = byModel.get(`${device.brand}|${categoryIds.get(device.category)}|${modelKey(device.brand, device.name)}`);
      const exact = bySlug.get(device.slug);
      return model ?? (exact && exact.brand_id === brandIds.get(device.brand) ? exact : null);
    };
  };
  let find = await loadDevices();
  const missing = devices.filter((device) => !find(device));
  reused.devices = devices.length - missing.length;
  await insert(db.Device, missing.map((device) => ({
    slug: device.slug, name: device.name, brand_id: brandIds.get(device.brand), category_id: categoryIds.get(device.category),
    release_date: device.release_date, soc: device.soc, battery_mah: device.battery_mah, os_family: device.os,
    verification_status: device.verified ? 'verified' : 'unverified', is_active: true,
    specs: { ...device.specs, ...(device.model_numbers && { model_numbers: device.model_numbers }) },
    source_metadata: { ...provenance, source_urls: device.sources }
  })), 'devices');
  if (apply) find = await loadDevices();

  const configKey = (id, ram, storage) => `${id}|${ram == null ? '' : Number(ram)}|${storage ?? ''}`;
  const existingVariants = await db.DeviceVariant.findAll({ attributes: ['device_id', 'ram_gb', 'storage_gb', 'canonical_key'], raw: true, ...opts });
  const haveKeys = new Set(existingVariants.map((row) => row.canonical_key));
  const haveConfigs = new Set(existingVariants.map((row) => configKey(row.device_id, row.ram_gb, row.storage_gb)));
  const curated = new Set(existingVariants.map((row) => row.device_id));
  const withMedia = new Set((await db.DeviceMedia.findAll({
    attributes: ['device_id'], where: { media_type: 'image', device_variant_id: null, device_variant_color_id: null }, raw: true, ...opts
  })).map((row) => row.device_id));
  const variantRows = [];
  const mediaRows = [];
  const photographed = [];
  for (const device of devices) {
    const row = find(device);
    if (!row && apply) throw new Error(`Device ${device.slug} clashes with an existing row of another brand or category`);
    for (const variant of device.variants) {
      const canonical_key = catalogueVariantKey(row?.slug ?? device.slug, device.network, variant);
      if (haveKeys.has(canonical_key)) continue;
      if (row && curated.has(row.id) && (variant.ram == null || variant.storage == null)) continue;
      if (row && !variant.fingerprint && haveConfigs.has(configKey(row.id, variant.ram, variant.storage))) continue;
      haveKeys.add(canonical_key);
      variantRows.push({
        device_id: row?.id, canonical_key, ram_gb: variant.ram, storage_gb: variant.storage,
        network_generation: device.network, region: 'global', model_number: null, sim_type: device.sim,
        attributes: { label: variantLabel(variant.ram, variant.storage), ...(variant.extra && { configuration: variant.extra }) },
        source_metadata: { ...provenance, source_urls: device.sources },
        verification_status: variant.verified ? 'verified' : 'unverified', is_active: true
      });
      if (row) changedDeviceIds.add(row.id);
    }
    const image = images[device.slug];
    if (!image || row?.primary_image_url || (row && withMedia.has(row.id))) continue;
    if (row) withMedia.add(row.id);
    const key = `devices/${image.file}`;
    const url = `${mediaBase}/uploads/${key}`;
    mediaRows.push({ device_id: row?.id, url, storage_key: key, media_type: 'image', sort_order: 0, is_primary: true, source: image.source });
    if (row) {
      const { file, bytes, ...credit } = image;
      photographed.push({ id: row.id, url, credit });
      changedDeviceIds.add(row.id);
    }
  }
  await insert(db.DeviceVariant, variantRows, 'variants');
  await insert(db.DeviceMedia, mediaRows, 'media');
  // The credit line must stay with the device: Commons photos require attribution.
  if (apply) {
    for (const part of chunk(photographed, 200)) {
      const rows = new Map((await db.Device.findAll({ where: { id: part.map((item) => item.id) }, ...opts })).map((row) => [row.id, row]));
      for (const { id, url, credit } of part) {
        const row = rows.get(id);
        await row.update({ primary_image_url: url, source_metadata: { ...(row.source_metadata ?? {}), image: credit } }, opts);
      }
    }
  }
  return { created, reused, changedDeviceIds };
}

async function main() {
  const args = process.argv.slice(2);
  const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
  const list = (name) => option(name)?.split(',').map((item) => item.trim()).filter(Boolean) ?? null;
  const apply = args.includes('--apply');
  const manifest = JSON.parse(gunzipSync(readFileSync(new URL('./data/device-catalogue.json.gz', import.meta.url))));
  const indexPath = path.join(uploadsDir, 'index.json');
  const images = Object.fromEntries(Object.entries(existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf8')) : {})
    .filter(([, image]) => existsSync(path.join(uploadsDir, image.file))));
  const devices = selectDevices(manifest.devices, {
    since: option('--since'), brands: list('--brands'), categories: list('--categories'), imagesOnly: args.includes('--with-images-only'), images
  });
  const mediaBase = (process.env.PUBLIC_API_BASE_URL || process.env.APP_URL || '').replace(/\/$/, '');
  if (!/^https?:\/\//.test(mediaBase)) throw new Error('Set PUBLIC_API_BASE_URL or APP_URL');

  const { default: db } = await import('../models/index.js');
  db.sequelize.options.logging = false;
  try {
    await db.sequelize.authenticate();
    const [[{ name: database }]] = await db.sequelize.query('SELECT DATABASE() AS name');
    if (option('--database') && option('--database') !== database) throw new Error(`Connected to ${database}, expected ${option('--database')}`);
    const run = (transaction) => seedCatalogue(db, { manifest, devices, images, mediaBase, transaction, apply });
    const result = apply ? await db.sequelize.transaction(run) : await run(undefined);
    console.log(JSON.stringify({
      mode: apply ? 'applied' : 'dry-run (pass --apply to write)', database,
      devices_selected: devices.length, devices_with_photo: devices.filter((device) => images[device.slug]).length,
      existing_devices_reused: result.reused.devices, [apply ? 'created' : 'would_create']: result.created
    }, null, 2));
    if (apply) console.log('Run "npm run catalog:backfill-promotions" if the promotions CMS should see the new devices.');
  } finally {
    await db.sequelize.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => { console.error('Catalogue seed failed:', error.message); process.exitCode = 1; });
}
