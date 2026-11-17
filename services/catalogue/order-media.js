import db from '../../models/index.js';

export const cataloguePhoto = device => device?.media
  ?.filter(row => row.media_type === 'image' && row.url)
  .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0]?.url
  || device?.primary_image_url || null;

export const listingPhoto = listing => cataloguePhoto(listing?.variant?.device)
  || listing?.images?.filter(row => row.url)
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0]?.url
  || null;

export const orderListingMedia = {
  model: db.SellerListing, as: 'seller_listing', required: false,
  include: [
    { model: db.ListingImage, as: 'images' },
    { model: db.DeviceVariant, as: 'variant', include: [{
      model: db.Device, as: 'device', include: [{ model: db.DeviceMedia, as: 'media' }],
    }] },
  ],
};

export function orderItemSummary(item) {
  return {
    id: item.id,
    product_id: item.product_id,
    product_name: item.product_name,
    product_image: item.product_image || listingPhoto(item.seller_listing),
    quantity: item.quantity,
    price: Number(item.price),
    subtotal: Number(item.subtotal),
  };
}
