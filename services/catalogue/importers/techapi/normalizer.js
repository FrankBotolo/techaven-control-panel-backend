import path from 'node:path';
import { canonicalVariantKey, normalizeNetwork, slugify } from '../../normalization.js';

const memorySuffix = /-(?:\d+(?:\.\d+)?gb(?:-ram)?-)?\d+(?:\.\d+)?gb(?:-(?:4g|5g))?$/i;

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function baseSlug(record, relativePath) {
  const parent = path.basename(path.dirname(relativePath));
  const candidate = record.base_model_slug || (parent !== path.basename(path.dirname(path.dirname(relativePath))) ? parent : record.slug);
  return slugify(candidate).replace(memorySuffix, '');
}

export function normalizeTechApiRecord(input, sourceRevision = null) {
  const { record, relativePath } = input;
  if (!record || !record.slug || !record.name || !record.brand) {
    return { error: { relativePath, code: 'INVALID_RECORD', message: 'slug, name and brand are required' } };
  }
  const storage = finiteNumber(record.variant?.memory?.storage_gb ?? record.storage_gb ?? record.storage_options_gb?.[0]);
  const ram = finiteNumber(record.variant?.memory?.ram_gb ?? record.ram_gb);
  const network = normalizeNetwork(record.variant?.network?.cellular ?? record.connectivity?.network ?? record.network_generation);
  const region = slugify(record.variant?.region || record.region || 'global') || 'global';
  const modelNumber = record.variant?.model_number || record.model_number || record.raw_smartprix?.['General.Model'] || null;
  const deviceSlug = baseSlug(record, relativePath);
  const isVariant = Boolean(record.variant || path.dirname(relativePath).split(path.sep).length > 2);
  const sourceMetadata = {
    provider: 'TechAPI', source_revision: sourceRevision, source_path: relativePath,
    source_urls: Array.isArray(record.source_urls) ? record.source_urls : [], verified: record.verified === true
  };
  const specs = {
    display: record.display || null, cameras: record.cameras || null,
    charging: { wired_w: record.charging_wired_w ?? null, wireless_w: record.charging_wireless_w ?? null },
    dimensions: record.dimensions || null, ip_rating: record.ip_rating || null,
    connectivity: record.connectivity || null, weight_g: record.weight_g ?? null
  };
  const device = {
    slug: deviceSlug,
    name: isVariant ? String(record.name).replace(/\s*\([^)]*(?:GB|RAM)[^)]*\)\s*/i, '').trim() : record.name,
    release_date: record.release_date || null,
    soc: record.soc || null,
    battery_mah: finiteNumber(record.battery_mah),
    os_family: String(record.os || '').split(/\s+v?\d/)[0] || null,
    specs,
    primary_image_url: record.image_url || null,
    verification_status: record.verified === true ? 'verified' : 'unverified',
    source_metadata: sourceMetadata
  };
  const variant = {
    canonical_key: canonicalVariantKey(deviceSlug, { ram_gb: ram, storage_gb: storage, network_generation: network, region, model_number: modelNumber }),
    model_number: modelNumber,
    ram_gb: ram,
    storage_gb: storage,
    network_generation: network,
    region,
    sim_type: record.variant?.sim || record.connectivity?.sim || null,
    attributes: { source_slug: record.slug, source_variant: record.variant || null },
    verification_status: record.verified === true ? 'verified' : 'unverified',
    source_metadata: sourceMetadata
  };
  return { brand: { name: record.brand, slug: slugify(record.brand) }, device, variant };
}
