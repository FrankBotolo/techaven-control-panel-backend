import { slugify } from './normalization.js';

function numericHint(value, pattern) {
  const match = String(value || '').match(pattern);
  return match ? Number(match[1]) : null;
}

export function legacyHints(product) {
  const text = `${product.name || ''} ${product.description || ''}`;
  const specs = product.specifications || {};
  return {
    name: slugify(product.name),
    brand: slugify(product.vendor),
    ram_gb: Number(specs.ram_gb) || numericHint(text, /(\d+)\s*gb\s*(?:ram|memory)/i),
    storage_gb: Number(specs.storage_gb) || numericHint(text, /(\d+)\s*gb\s*(?:storage|rom)/i),
    network_generation: /\b5g\b/i.test(text) ? '5G' : /\b4g\b/i.test(text) ? '4G' : null
  };
}

export function scoreLegacyProduct(product, variant) {
  const hints = legacyHints(product);
  const deviceName = slugify(variant.device?.name);
  const brand = slugify(variant.device?.brand?.name);
  let score = 0;
  const evidence = [];
  if (hints.name === deviceName) { score += 0.6; evidence.push('exact_device_name'); }
  else if (hints.name.includes(deviceName) || deviceName.includes(hints.name)) { score += 0.4; evidence.push('partial_device_name'); }
  if (hints.brand && hints.brand === brand) { score += 0.15; evidence.push('brand'); }
  if (hints.ram_gb && Number(variant.ram_gb) === hints.ram_gb) { score += 0.1; evidence.push('ram'); }
  if (hints.storage_gb && Number(variant.storage_gb) === hints.storage_gb) { score += 0.1; evidence.push('storage'); }
  if (hints.network_generation && variant.network_generation === hints.network_generation) { score += 0.05; evidence.push('network'); }
  return { score: Math.min(score, 1), evidence, hints };
}

export function bestLegacyCandidate(product, variants, threshold = 0.85) {
  const ranked = variants.map((variant) => ({ variant, ...scoreLegacyProduct(product, variant) })).sort((a, b) => b.score - a.score || a.variant.id - b.variant.id);
  const best = ranked[0];
  const unique = best && (!ranked[1] || best.score > ranked[1].score);
  return { best: best || null, highConfidence: Boolean(best && unique && best.score >= threshold), alternatives: ranked.slice(0, 5).map(({ variant, score, evidence }) => ({ variant_id: variant.id, score, evidence })) };
}
