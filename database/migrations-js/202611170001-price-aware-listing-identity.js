import { listingIdentity } from '../../models/SellerListing.js';

export async function up({ sequelize, transaction }) {
  const [rows] = await sequelize.query(
    "SELECT id, shop_id, device_variant_id, device_variant_color_id, `condition`, currency, price, status, merchant_sku, details, active_identity FROM seller_listings WHERE status = 'active'",
    { transaction }
  );
  for (const row of rows) {
    const identity = listingIdentity(row);
    if (identity === row.active_identity) continue;
    await sequelize.query('UPDATE seller_listings SET active_identity = ? WHERE id = ?', {
      replacements: [identity, row.id],
      transaction
    });
  }
}
