import { createHash } from 'node:crypto';

// Offer identity includes seller-specific unit facts. It never treats memory
// extension as physical RAM, or merges an open-box unit with a new one.
export function offerKey(offer) {
  return JSON.stringify([offer.slug, offer.ram_gb ?? null, offer.storage_gb ?? null,
    offer.condition ?? 'new', offer.network_generation ?? null, offer.sim_type ?? null,
    offer.region ?? null, offer.configuration ?? null, offer.extended_ram_gb ?? null,
    offer.condition_details ?? null]);
}

export function consolidateOffers(offers) {
  const result = new Map();
  for (const row of offers) {
    if (!Number.isSafeInteger(row.price) || row.price <= 0) throw new Error(`Invalid price: ${row.slug}`);
    if (row.ram_gb != null && !(row.ram_gb > 0)) throw new Error(`Invalid RAM: ${row.slug}`);
    const key = offerKey(row), previous = result.get(key);
    const sources = [...new Set([...(previous?.sources ?? []), ...(row.sources ?? [])])];
    result.set(key, { ...(previous && previous.price > row.price ? previous : row), sources });
  }
  return [...result.values()];
}

export function offerFingerprint(offer) {
  return createHash('sha256').update(offerKey(offer)).digest('hex').slice(0, 20);
}
