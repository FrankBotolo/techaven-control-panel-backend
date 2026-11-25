/**
 * Seeds the v2 catalogue variant matrix: brands, devices, variants (RAM/storage/network)
 * and manufacturer colours per variant. Idempotent: existing rows are matched by slug /
 * canonical key and left in place, so reruns only add what is missing.
 *
 *   node scripts/seed-device-variants.js           # dry run (prints what would change)
 *   node scripts/seed-device-variants.js --apply   # write to the database
 */
import '../utils/loadEnv.js';
import db from '../models/index.js';
import { canonicalVariantKey, slugify } from '../services/catalogue/normalization.js';
import { enqueueDevice } from '../services/catalogue/promotionSync.js';
import { catalogue, colorFamilies } from './data/device-variants.js';

const apply = process.argv.includes('--apply');
const created = { brands: 0, devices: 0, variants: 0, colors: 0, assignments: 0 };
const touchedDevices = new Set();
const missingCategories = new Set();

const isUnverified = (entry, [ram, storage]) => (entry.unverified || []).some(([r, s]) => r === ram && s === storage);
const storageLabel = (gb) => (gb >= 1024 ? `${gb / 1024}TB` : `${gb}GB`);

async function findOrMake(model, where, values, counter, transaction) {
  const found = await model.findOne({ where, transaction });
  if (found) return found;
  created[counter]++;
  return apply ? model.create(values, { transaction }) : null;
}

async function run(transaction) {
  const families = new Map();
  const brands = new Map();
  for (const [slug, family] of Object.entries(colorFamilies)) {
    families.set(slug, await findOrMake(db.Color, { slug }, { slug, name: family.name, default_hex: family.hex }, 'colors', transaction));
  }

  for (const entry of catalogue) {
    const category = await db.Category.findOne({ where: { name: entry.category, shop_id: null, status: 'approved' }, transaction });
    if (!category) { missingCategories.add(entry.category); continue; }

    const brandSlug = slugify(entry.brand);
    if (!brands.has(brandSlug)) brands.set(brandSlug, await findOrMake(db.Brand, { slug: brandSlug }, { slug: brandSlug, name: entry.brand, is_active: true }, 'brands', transaction));
    const brand = brands.get(brandSlug);
    const sourceMetadata = { provider: 'manufacturer-variant-seed', sources: entry.sources, checked_at: '2026-11-18' };
    const device = await findOrMake(db.Device, { slug: entry.slug }, {
      slug: entry.slug, name: entry.name, brand_id: brand?.id, category_id: category.id,
      release_date: entry.release_date, soc: entry.soc, os_family: entry.os_family,
      verification_status: 'verified', specs: {}, source_metadata: sourceMetadata, is_active: true
    }, 'devices', transaction);

    for (const config of entry.configs) {
      const [ram_gb, storage_gb] = config;
      const fields = { ram_gb, storage_gb, network_generation: entry.network_generation, region: 'global', model_number: null };
      const canonical_key = canonicalVariantKey(entry.slug, fields);
      const variant = device
        ? await findOrMake(db.DeviceVariant, { canonical_key }, {
          ...fields, device_id: device.id, canonical_key, sim_type: entry.sim_type,
          verification_status: isUnverified(entry, config) ? 'unverified' : 'verified',
          attributes: { label: `${ram_gb}GB RAM · ${storageLabel(storage_gb)}` }, source_metadata: sourceMetadata, is_active: true
        }, 'variants', transaction)
        : (created.variants++, null);
      if (variant) touchedDevices.add(device.id);

      for (const color of entry.colors) {
        const slug = slugify(color.manufacturer_name);
        if (!variant) { created.assignments++; continue; }
        await findOrMake(db.DeviceVariantColor, { device_variant_id: variant.id, slug }, {
          device_variant_id: variant.id, color_id: families.get(color.family)?.id, manufacturer_name: color.manufacturer_name,
          slug, hex_override: color.hex, verified: !isUnverified(entry, config)
        }, 'assignments', transaction);
      }
    }
  }
}

try {
  await db.sequelize.authenticate();
  if (apply) await db.sequelize.transaction(run); else await run(undefined);
  if (apply) for (const id of touchedDevices) await enqueueDevice(id, { reason: `variant-seed:${Date.now()}` });
  console.log(JSON.stringify({
    mode: apply ? 'applied' : 'dry-run (pass --apply to write)',
    devices_in_manifest: catalogue.length,
    [apply ? 'created' : 'would_create']: created,
    missing_categories: [...missingCategories]
  }, null, 2));
} catch (error) {
  console.error('Variant seed failed:', error.message);
  process.exitCode = 1;
} finally {
  await db.sequelize.close();
}
