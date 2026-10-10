export function slugify(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeNetwork(value) {
  const match = String(value ?? '').toUpperCase().match(/\b([2-6]G)\b/);
  return match ? match[1] : null;
}

export function canonicalVariantKey(deviceSlug, fields = {}) {
  const parts = [
    slugify(deviceSlug),
    fields.ram_gb ?? 'na',
    fields.storage_gb ?? 'na',
    normalizeNetwork(fields.network_generation) || 'na',
    slugify(fields.region || 'global'),
    slugify(fields.model_number || 'na')
  ];
  return parts.join('|');
}

export function variantAxes(variants) {
  const axes = ['ram_gb', 'storage_gb', 'network_generation', 'region', 'sim_type', 'model_number'];
  return axes.filter((axis) => new Set(variants.map((variant) => variant[axis]).filter((value) => value != null)).size > 1);
}
