export function rankMedia(media, variantId = null, variantColorId = null) {
  return [...media]
    .filter((item) => !item.device_variant_id || item.device_variant_id === variantId)
    .filter((item) => !item.device_variant_color_id || item.device_variant_color_id === variantColorId)
    .sort((a, b) => {
      const score = (item) =>
        (variantId != null && item.device_variant_id === variantId ? 4 : 0) +
        (variantColorId != null && item.device_variant_color_id === variantColorId ? 8 : 0) +
        (item.is_primary ? 2 : 0);
      return score(b) - score(a) || a.sort_order - b.sort_order || a.id - b.id;
    });
}
