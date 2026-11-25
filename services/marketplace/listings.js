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

const DETAIL_FLAGS = ['tax_exclusive', 'warranty_available', 'swap_plus_cash'];
const DETAIL_RAM = ['extended_ram_gb', 'advertised_ram_gb'];
const FINGERPRINT = new Set(['working', 'not_working']);

/**
 * Seller-editable listing facts shown on the product page (see publicListingDetails).
 * Only whitelisted keys are accepted; internal keys already on the listing (source notes etc.) are kept.
 * `undefined` input leaves details untouched; null / '' / false clears a fact.
 */
export function sanitizeListingDetails(input, existing = null) {
  if (input === undefined) return existing;
  if (input !== null && (typeof input !== 'object' || Array.isArray(input))) throw new CatalogueError('INVALID_LISTING_DETAILS', 'details must be an object');
  const src = input || {};
  const base = existing && typeof existing === 'object' ? { ...existing } : {};
  for (const key of [...DETAIL_FLAGS, ...DETAIL_RAM, 'condition_details']) delete base[key];
  for (const key of DETAIL_FLAGS) if (src[key] === true) base[key] = true;
  for (const key of DETAIL_RAM) {
    if (src[key] == null || src[key] === '') continue;
    const n = Number(src[key]);
    if (!Number.isFinite(n) || n <= 0 || n > 64) throw new CatalogueError('INVALID_LISTING_DETAILS', `${key} must be between 0 and 64`);
    base[key] = n;
  }
  const cd = src.condition_details;
  if (cd != null) {
    if (typeof cd !== 'object' || Array.isArray(cd)) throw new CatalogueError('INVALID_LISTING_DETAILS', 'condition_details must be an object');
    const out = {};
    if (cd.battery_health_percent != null && cd.battery_health_percent !== '') {
      const n = Number(cd.battery_health_percent);
      if (!Number.isInteger(n) || n < 1 || n > 100) throw new CatalogueError('INVALID_LISTING_DETAILS', 'battery_health_percent must be a whole number from 1 to 100');
      out.battery_health_percent = n;
    }
    if (cd.fingerprint_reader != null && cd.fingerprint_reader !== '') {
      if (!FINGERPRINT.has(cd.fingerprint_reader)) throw new CatalogueError('INVALID_LISTING_DETAILS', 'fingerprint_reader must be working or not_working');
      out.fingerprint_reader = cd.fingerprint_reader;
    }
    if (Object.keys(out).length) base.condition_details = out;
  }
  return Object.keys(base).length ? base : null;
}
