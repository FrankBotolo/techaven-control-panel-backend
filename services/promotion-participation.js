import db from '../models/index.js';
import { Op } from 'sequelize';
import { toDeviceDto } from './catalogue/dto.js';

export const fail = (message, status = 400) => Object.assign(new Error(message), { status });
export const campaignGateway = {
  async load() {
    const base = (process.env.CMS_PROMOTIONS_API_URL || 'https://cms.techavenmw.com').replace(/\/$/, '');
    const response = await fetch(`${base}/api/promotions/active`, { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' } });
    if (!response.ok) throw fail('Promotion service unavailable. Try again shortly.', 503);
    const body = await response.json();
    if (!Array.isArray(body.data)) throw fail('Promotion service unavailable.', 503);
    return body.data.filter(row => row.useParticipatingOffers === true && /^[a-z0-9-]{1,191}$/.test(row.slug))
      .map(({ slug, headline }) => ({ slug, headline }));
  },
};
export async function campaign(slug) {
  if (typeof slug !== 'string' || !/^[a-z0-9-]{1,191}$/.test(slug)) throw fail('Choose a valid promotion');
  const found = (await campaignGateway.load()).find(row => row.slug === slug);
  if (!found) throw fail('This promotion is not accepting participating offers', 404);
  return found;
}
export async function ensurePromotionSlot(slug, listingId, transaction) {
  const [rows] = await db.sequelize.query("SELECT listing_id FROM promotion_participations WHERE campaign_slug=? AND status='approved' FOR UPDATE", { replacements: [slug], transaction });
  if (rows.filter(row => row.listing_id !== listingId).length >= 12) throw fail('This promotion already has 12 approved offers. Remove an offer first.', 409);
}
export function offerSnapshot(listing) {
  return { shop_id: listing.shop_id, device_variant_id: listing.device_variant_id,
    device_variant_color_id: listing.device_variant_color_id ?? null, condition: listing.condition,
    currency: listing.currency, price: Number(listing.price).toFixed(2) };
}
export function unchangedOffer(listing, snapshot) {
  if (typeof snapshot === 'string') snapshot = JSON.parse(snapshot);
  const current = offerSnapshot(listing);
  return Object.keys(current).every(key => current[key] === snapshot?.[key]);
}
export async function eligibleListing(id, transaction) {
  if (!Number.isSafeInteger(Number(id)) || Number(id) < 1) throw fail('Choose a valid shop listing');
  const listing = await db.SellerListing.findByPk(id, {
    include: [{ model: db.Shop, as: 'shop' }, { model: db.DeviceVariant, as: 'variant', include: [{ model: db.Device, as: 'device', include: [{ model: db.Brand, as: 'brand' }] }] }], transaction,
  });
  if (!listing || listing.status !== 'active' || listing.quantity < 1 || listing.shop?.status !== 'active' || listing.shop?.application_status !== 'approved' || !listing.variant?.is_active || !listing.variant?.device?.is_active || !listing.variant?.device?.brand?.is_active)
    throw fail('This offer is unavailable or its shop is not approved', 409);
  return listing;
}
export async function approvedDevices(slug) {
  await campaign(slug);
  const [rows] = await db.sequelize.query("SELECT listing_id,offer_snapshot FROM promotion_participations WHERE campaign_slug=? AND status='approved' ORDER BY id LIMIT 12", { replacements: [slug] });
  const results = [];
  for (const row of rows) {
    let listing;
    try { listing = await eligibleListing(row.listing_id); } catch (error) { if (error.status === 409) continue; throw error; }
    if (!unchangedOffer(listing, row.offer_snapshot)) continue;
    const device = await db.Device.findByPk(listing.variant.device_id, { include: [
      { model: db.Brand, as: 'brand' }, { model: db.Category, as: 'category' }, { model: db.DeviceMedia, as: 'media' },
      { model: db.DeviceVariant, as: 'variants', where: { id: listing.device_variant_id }, include: [
        { model: db.SellerListing, as: 'seller_listings', where: { id: listing.id, status: 'active', quantity: { [Op.gt]: 0 } }, include: [{ model: db.Shop, as: 'shop' }, { model: db.ListingImage, as: 'images' }] },
      ] },
    ] });
    if (device) results.push(toDeviceDto(device, { includeOffers: true }));
  }
  return results;
}
