import { rankMedia } from './media.js';
import { variantAxes } from './normalization.js';

const plain = (value) => value?.get ? value.get({ plain: true }) : value;

export function toVariantDto(value) {
  const variant = plain(value);
  return {
    id: variant.id,
    model_number: variant.model_number,
    ram_gb: variant.ram_gb == null ? null : Number(variant.ram_gb),
    storage_gb: variant.storage_gb,
    network_generation: variant.network_generation,
    region: variant.region,
    sim_type: variant.sim_type,
    attributes: variant.attributes || {},
    colors: (variant.colors || []).map((item) => ({
      id: item.id, manufacturer_name: item.manufacturer_name, slug: item.slug,
      hex: item.hex_override || item.color?.default_hex || null,
      color: item.color ? { id: item.color.id, name: item.color.name, slug: item.color.slug } : null
    }))
  };
}

export function toDeviceDto(value, { includeOffers = false } = {}) {
  const device = plain(value);
  const variants = (device.variants || []).map(toVariantDto);
  const result = {
    id: device.id,
    slug: device.slug,
    name: device.name,
    brand: device.brand ? { id: device.brand.id, name: device.brand.name, slug: device.brand.slug } : null,
    category: device.category ? { id: device.category.id, name: device.category.name } : null,
    release_date: device.release_date,
    soc: device.soc,
    battery_mah: device.battery_mah,
    os_family: device.os_family,
    specs: device.specs || {},
    primary_image_url: device.primary_image_url,
    media: rankMedia(device.media || []).map((item) => ({ id: item.id, url: item.url, media_type: item.media_type, is_primary: item.is_primary })),
    variant_axes: variantAxes(variants),
    variants
  };
  if (includeOffers) {
    result.offers = variants.flatMap((variant) => {
      const source = (device.variants || []).find((item) => plain(item).id === variant.id);
      return (plain(source).seller_listings || []).map((listing) => ({
        id: listing.id,
        variant_id: variant.id,
        variant_color_id: listing.device_variant_color_id,
        shop: listing.shop ? { id: listing.shop.id, name: listing.shop.name } : null,
        condition: listing.condition,
        currency: listing.currency,
        price: Number(listing.price),
        details: listing.details || {},
        quantity: listing.quantity,
        warranty_months: listing.warranty_months,
        images: (listing.images || []).map((image) => ({ id: image.id, url: image.url, alt_text: image.alt_text, is_primary: image.is_primary }))
      }));
    }).sort((a, b) => a.price - b.price || a.id - b.id);
  }
  return result;
}
