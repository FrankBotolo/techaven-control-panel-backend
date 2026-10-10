import db from '../models/index.js';

const { Product, SellerListing } = db;

export async function restoreOrderItemStock(item, options = {}) {
  if (item.seller_listing_id) {
    const listing = await SellerListing.findByPk(item.seller_listing_id, options);
    if (listing) {
      listing.quantity = Number(listing.quantity || 0) + Number(item.quantity || 0);
      await listing.save(options);
      return 'listing';
    }
  }
  if (item.product_id) {
    const product = await Product.findByPk(item.product_id, options);
    if (product) {
      product.stock = Number(product.stock || 0) + Number(item.quantity || 0);
      await product.save(options);
      return 'product';
    }
  }
  return null;
}
