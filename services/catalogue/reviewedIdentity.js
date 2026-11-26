const reviewedAliases = [
  ['xiaomi-redmi-note-14-5g-standard-edition-global-dual-sim-td-lte-256gb-24094rad4g-xiaomi-beryl', 'redmi-note-14-5g', 5110, 'mediatek-dimensity-7025-mt6855v-atza', { model_number: '24094RAD4G', network_generation: '5G', storage_gb: 256 }],
  ...['premium-256', 'premium-512', 'standard-128', 'standard-256'].map((configuration) => {
    const [edition, storage] = configuration.split('-');
    return [`xiaomi-redmi-note-14-pro-4g-${edition}-edition-global-dual-sim-td-lte-${storage}gb-24116raccg-xiaomi-obsidian`,
      'redmi-note-14-pro-4g', 5500, 'mediatek-helio-g100-mt6789h', { model_number: '24116RACCG', network_generation: '4G', storage_gb: Number(storage) }];
  }),
];

export function reviewedCanonicalSlug(brand, slug) {
  return brand === 'xiaomi' ? reviewedAliases.find(([alias]) => alias === slug)?.[1] ?? slug : slug;
}

export function planReviewedMerges(devices) {
  const bySlug = new Map(devices.map((device) => [device.slug, device]));
  const merges = [];
  const ambiguous = [];
  for (const [alias, canonical, battery, soc, variantFacts] of reviewedAliases) {
    const source = bySlug.get(alias);
    const target = bySlug.get(canonical);
    if (!source?.is_active || source.canonical_device_id) continue;
    if (source.brand?.slug !== 'xiaomi' || target?.brand?.slug !== 'xiaomi' ||
        !target.is_active || target.canonical_device_id || source.category_id !== target.category_id ||
        source.battery_mah !== battery || target.battery_mah !== battery || source.soc !== soc ||
        ![null, '0', soc].includes(target.soc)) {
      ambiguous.push({ source: alias, target: canonical, reason: 'Catalog hardware or identity differs from reviewed evidence' });
      continue;
    }
    merges.push({ source, target, variantFacts });
  }

  for (const device of devices) {
    if (!device.is_active || device.canonical_device_id) continue;
    if (/redmi-note-14-pro.*plus|24115ra8eg|^redmi-note-(?:14(?:-pro)?|15-pro)$|airpods-(?:gen-?4|4th-gen)/i.test(device.slug)) {
      ambiguous.push({ source: device.slug, reason: 'Confirm exact regional hardware, radio generation, or ANC with model number before merging. Some bare Redmi model names contain mixed variant evidence.' });
    }
  }
  return { merges, ambiguous };
}
