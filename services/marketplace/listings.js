import { CatalogueError } from '../catalogue/errors.js';

export const CONDITIONS = new Set(['new', 'used', 'refurbished', 'open_box']);
export const STATUSES = new Set(['draft', 'active', 'paused', 'archived']);
export const IMAGE_REQUIRED_CONDITIONS = new Set(['used', 'refurbished', 'open_box']);

export function validateListingInput(input, imageCount = 0) {
  const price = Number(input.price);
  const quantity = Number(input.quantity ?? 0);
  const warranty = input.warranty_months == null ? null : Number(input.warranty_months);
  if (!Number.isFinite(price) || price <= 0) throw new CatalogueError('INVALID_PRICE', 'price must be greater than zero');
  if (!Number.isInteger(quantity) || quantity < 0) throw new CatalogueError('INVALID_QUANTITY', 'quantity must be a non-negative integer');
  if (!CONDITIONS.has(input.condition)) throw new CatalogueError('INVALID_CONDITION', 'condition is invalid');
  if (warranty != null && (!Number.isInteger(warranty) || warranty < 0)) throw new CatalogueError('INVALID_WARRANTY', 'warranty_months must be a non-negative integer');
  if (!/^[A-Z]{3}$/.test(String(input.currency || 'MWK').toUpperCase())) throw new CatalogueError('INVALID_CURRENCY', 'currency must be a three-letter code');
  if (IMAGE_REQUIRED_CONDITIONS.has(input.condition) && imageCount < 1) throw new CatalogueError('LISTING_IMAGE_REQUIRED', 'At least one seller image is required for this condition');
  if (input.status != null && !STATUSES.has(input.status)) throw new CatalogueError('INVALID_LISTING_STATUS', 'status is invalid');
  return { price, quantity, warranty_months: warranty, currency: String(input.currency || 'MWK').toUpperCase() };
}
