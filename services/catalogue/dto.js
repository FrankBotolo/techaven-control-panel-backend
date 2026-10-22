import { rankMedia } from './media.js';
import { variantAxes } from './normalization.js';

const plain = (value) => value?.get ? value.get({ plain: true }) : value;

// Raw source notes/evidence are retained in storage, not sent as public copy.
export function publicListingDetails(details = {}) {
  return Object.fromEntries(['tax_exclusive','extended_ram_gb','advertised_ram_gb',
    'condition_details','warranty_available','swap_plus_cash'].filter(key=>details?.[key]!=null)
    .map(key=>[key,details[key]]));
}

export function publicSpecifications(value) {
  if(Array.isArray(value))return value.map(publicSpecifications);
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key])=>!/^(source($|_)|raw_|metadata$|description$|notes?$|correction$|unresolved$)/.test(key))
    .map(([key,item])=>[key,publicSpecifications(item)]));
}

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
    attributes: publicSpecifications(variant.attributes || {}),
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
    specs: publicSpecifications(device.specs || {}),
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
        details: publicListingDetails(listing.details),
        quantity: listing.quantity,
        warranty_months: listing.warranty_months,
        images: (listing.images || []).map((image) => ({ id: image.id, url: image.url, alt_text: image.alt_text, is_primary: image.is_primary }))
      }));
    }).sort((a, b) => a.price - b.price || a.id - b.id);
  }
  return result;
}
