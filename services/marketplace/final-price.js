import { CatalogueError } from '../catalogue/errors.js';
export function assertFinalPrice(listing) {
  if (listing.details?.tax_exclusive) throw new CatalogueError('FINAL_PRICE_REQUIRED', 'Ask the shop to confirm a VAT-inclusive price before ordering this offer.', 409);
}
