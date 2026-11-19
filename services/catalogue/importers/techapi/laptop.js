import { createHash } from 'node:crypto';
import { canonicalVariantKey, slugify } from '../../normalization.js';

const positive = (value) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
const stable = (value) => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])])) : value;

export function normalizeLaptopRecord({ record, relativePath }, sourceRevision) {
  if (!record?.slug || !record.name || !record.brand || !record.base_model_slug) {
    return { error: { relativePath, code: 'INVALID_RECORD', message: 'Laptop slug, base_model_slug, name and brand are required' } };
  }
  // Namespace laptops so an identically named phone cannot be reassigned to another category.
  const slug = `laptop-${slugify(record.base_model_slug)}`;
  const configuration = {
    cpu: record.cpu ?? null, cpu_name: record.cpu_name ?? null,
    gpu: record.gpu ?? null, gpu_name: record.gpu_name ?? null, gpu_type: record.gpu_type ?? null,
    display: record.display ?? null, os: record.os ?? null, os_version: record.os_version ?? null,
    weight_g: record.weight_g ?? null, device_category: record.device_category ?? null
  };
  const ram = positive(record.ram_gb);
  const storage = positive(record.storage_gb);
  const fingerprint = createHash('sha256').update(JSON.stringify(stable(configuration))).digest('hex').slice(0, 24);
  const source = {
    provider: 'TechAPI', source_revision: sourceRevision, source_path: relativePath,
    source_urls: record.source_urls ?? [], verified: record.verified === true,
    image_license: record.image_license ?? null, image_attribution: record.image_attribution ?? null
  };
  const status = record.verified === true ? 'verified' : 'unverified';
  return {
    brand: { name: record.brand, slug: slugify(record.brand) },
    device: {
      slug, name: record.name, release_date: record.release_date ?? null,
      soc: record.cpu_name ?? record.cpu ?? null, battery_mah: null,
      os_family: record.os ?? null, specs: configuration,
      primary_image_url: record.image_url ?? null, verification_status: status, source_metadata: source
    },
    variant: {
      canonical_key: `${canonicalVariantKey(slug, { ram_gb: ram, storage_gb: storage })}|${fingerprint}`,
      model_number: null, ram_gb: ram, storage_gb: storage, network_generation: null,
      region: 'global', sim_type: null, verification_status: status, source_metadata: source,
      attributes: { source_slug: record.slug, source_variant: record.variant ?? null, configuration,
        reference_msrp_usd: record.msrp_usd ?? null }
    }
  };
}

// A model family may contain different CPUs/displays. Only shared facts belong on the device;
// complete configuration facts stay on each variant.
export function sharedLaptopDevices(normalized) {
  const groups = new Map();
  for (const item of normalized.filter((item) => !item.error)) {
    const group = groups.get(item.device.slug) ?? [];
    group.push(item.device);
    groups.set(item.device.slug, group);
  }
  return new Map([...groups].map(([slug, group]) => {
    const preferred = group.find((device) => device.verification_status === 'verified') ?? group[0];
    const shared = (values) => values.every((value) => JSON.stringify(value) === JSON.stringify(values[0])) ? values[0] : null;
    return [slug, { ...preferred,
      soc: shared(group.map((device) => device.soc)),
      os_family: shared(group.map((device) => device.os_family)),
      release_date: shared(group.map((device) => device.release_date)),
      specs: Object.fromEntries(Object.keys(preferred.specs).map((key) => [key, shared(group.map((device) => device.specs[key]))]))
    }];
  }));
}
