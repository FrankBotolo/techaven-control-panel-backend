/**
 * Seeds the catalogue and storefront data in scripts/data/commerce (see extract-commerce-seed.js).
 * Add-only and idempotent: rows already present are matched by natural key and never changed.
 * Ids from the dump are remapped, so it is safe on a database that already holds other rows.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import bcrypt from 'bcryptjs';
import { listingIdentity } from '../../models/SellerListing.js';
import { replaceOrigin } from '../rewrite-media-origins.js';

const DUMP_ORIGIN = 'http://localhost:8000';
const BATCH = 500;

export function loadSeedTable(table) {
  return gunzipSync(readFileSync(new URL(`../data/commerce/${table}.ndjson.gz`, import.meta.url)))
    .toString('utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

/** Placeholder login on the reserved .test domain, so no mail can reach a real person. */
export const ownerEmail = (shopName) =>
  `${shopName.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}@shops.techaven.test`;

/** @returns counts of created and reused rows per table; with apply=false nothing is written. */
export async function seedCommerce(db, { mediaBase, sellerPassword, subscription = { package: 'growth', days: 365 }, transaction, apply }) {
  const opts = { transaction };
  const report = {};
  const lower = (value) => String(value).toLowerCase(); // MySQL compares these keys case-insensitively

  const insert = async (model, rows) => {
    if (!apply) return;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH).map(({ id, ...row }) => replaceOrigin(
        Object.fromEntries(Object.entries(row).filter(([name]) => model.rawAttributes[name])), DUMP_ORIGIN, mediaBase
      ));
      await model.bulkCreate(batch, { ...opts, validate: false });
    }
  };
  const existingIds = async (model, attributes, keyOf, where) => {
    const rows = await model.findAll({ attributes: ['id', ...attributes], where, order: [['id', 'DESC']], raw: true, ...opts });
    return new Map(rows.map((row) => [keyOf(row), row.id])); // lowest id wins
  };

  /** Adds missing rows; returns dump id -> database id. In a dry run new rows get a placeholder id. */
  const seedTable = async (model, rows, { attributes, keyOf, where }) => {
    const before = await existingIds(model, attributes, keyOf, where);
    const missing = rows.filter((row) => !before.has(keyOf(row)));
    await insert(model, missing);
    report[model.getTableName()] = { created: missing.length, reused: rows.length - missing.length };
    const after = apply && missing.length ? await existingIds(model, attributes, keyOf, where) : before;
    return new Map(rows.map((row) => {
      const id = after.get(keyOf(row));
      if (id == null && apply) throw new Error(`${model.getTableName()} ${keyOf(row)} was not found after insert`);
      return [row.id, id ?? `new:${row.id}`];
    }));
  };
  const remap = (rows, columns) => rows.map((row) => {
    const copy = { ...row };
    for (const [column, ids] of Object.entries(columns)) {
      if (row[column] == null) continue;
      if (!ids.has(row[column])) throw new Error(`Seed row ${row.id} has unknown ${column} ${row[column]}`);
      copy[column] = ids.get(row[column]);
    }
    return copy;
  });

  const settings = loadSeedTable('platform_settings');
  const hasSettings = await db.PlatformSetting.count(opts) > 0; // singleton: the first row is authoritative
  if (!hasSettings) await insert(db.PlatformSetting, settings);
  report.platform_settings = { created: hasSettings ? 0 : settings.length, reused: hasSettings ? settings.length : 0 };

  const categories = await seedTable(db.Category, loadSeedTable('categories'), {
    attributes: ['name'], keyOf: (row) => lower(row.name), where: { shop_id: null, status: 'approved' }
  });
  const bySlug = { attributes: ['slug'], keyOf: (row) => lower(row.slug) };
  const brands = await seedTable(db.Brand, loadSeedTable('brands'), bySlug);
  const deviceRows = remap(loadSeedTable('devices'), { brand_id: brands, category_id: categories });
  const devices = await seedTable(db.Device, deviceRows, bySlug);
  const variants = await seedTable(db.DeviceVariant, remap(loadSeedTable('device_variants'), { device_id: devices }), {
    attributes: ['canonical_key'], keyOf: (row) => lower(row.canonical_key)
  });

  // Media is added only to parents that have none, so curated photos stay as they are.
  const seedMedia = async (model, rows, parent) => {
    const have = new Set((await model.findAll({ attributes: [parent], raw: true, ...opts })).map((row) => row[parent]));
    const missing = rows.filter((row) => !have.has(row[parent]));
    await insert(model, missing);
    report[model.getTableName()] = { created: missing.length, reused: rows.length - missing.length };
  };
  await seedMedia(db.DeviceMedia, remap(loadSeedTable('device_media'), { device_id: devices, device_variant_id: variants }), 'device_id');

  const shops = await seedTable(db.Shop, loadSeedTable('shops'), { attributes: ['name'], keyOf: (row) => lower(row.name) });

  // The dump has no shop owners: give each shop without a seller one placeholder account.
  // Shop phone numbers are not copied to the account, so no SMS is sent to them either.
  const shopRows = loadSeedTable('shops');
  const users = await db.User.findAll({ attributes: ['id', 'email', 'shop_id', 'role'], raw: true, ...opts });
  const staffed = new Set(users.filter((user) => user.role === 'seller').map((user) => user.shop_id));
  const emails = new Set(users.map((user) => lower(user.email)));
  const owners = shopRows.filter((shop) => !staffed.has(shops.get(shop.id)) && !emails.has(ownerEmail(shop.name)));
  if (apply && owners.length) {
    if (String(sellerPassword ?? '').length < 8) throw new Error('Set SEED_SELLER_PASSWORD (8 characters or more) for the shop owner accounts');
    const rows = await Promise.all(owners.map(async (shop) => ({
      name: shop.name, email: ownerEmail(shop.name), password: await bcrypt.hash(sellerPassword, 10), // bulkCreate skips the hashing hook
      role: 'seller', shop_id: shops.get(shop.id), is_verified: true, is_active: true, email_verified_at: new Date(), onboarding_required: false
    })));
    await db.User.bulkCreate(rows, { ...opts, validate: true });
  }
  report.users = { created: owners.length, reused: shopRows.length - owners.length };

  // Every seeded shop gets a paid, active subscription, unless it already has one that is current.
  // Sellers are checked on two tables: shop_subscriptions (seller portal) and user_subscriptions (access middleware).
  const pkg = await db.SubscriptionPackage.findOne({ where: { slug: subscription.package }, ...opts });
  if (!pkg && apply) throw new Error(`Subscription package "${subscription.package}" not found; run "npm run seed:packages:apply" or set SEED_SUBSCRIPTION_PACKAGE`);
  const start = new Date();
  const end = new Date(start.getTime() + subscription.days * 86400000);
  const shopIds = [...new Set(shopRows.map((shop) => shops.get(shop.id)))];
  const realIds = shopIds.filter((id) => typeof id === 'number');
  const currentPeriod = { [db.Sequelize.Op.or]: [{ current_period_end: null }, { current_period_end: { [db.Sequelize.Op.gt]: start } }] };
  const subscribed = new Set((await db.ShopSubscription.findAll({
    attributes: ['shop_id'], where: { shop_id: realIds, status: ['active', 'trialing'], ...currentPeriod }, raw: true, ...opts
  })).map((row) => row.shop_id));
  const unsubscribed = shopIds.filter((id) => !subscribed.has(id));
  const reference = 'seed:commerce';
  if (apply && unsubscribed.length) {
    await db.ShopSubscription.bulkCreate(unsubscribed.map((shop_id) => ({
      shop_id, package_id: pkg.id, status: 'active', payment_status: 'paid', current_period_start: start, current_period_end: end,
      cancel_at_period_end: false, auto_renew: false, payment_reference: reference, metadata: { created_via: reference }
    })), opts);
  }
  report.shop_subscriptions = { created: unsubscribed.length, reused: subscribed.size };

  const sellers = apply
    ? await db.User.findAll({ attributes: ['id'], where: { role: 'seller', shop_id: realIds }, raw: true, ...opts })
    : users.filter((user) => user.role === 'seller' && realIds.includes(user.shop_id));
  const sellerIds = sellers.map((user) => user.id).filter(Boolean);
  const entitled = new Set((await db.UserSubscription.findAll({
    attributes: ['user_id'], where: { user_id: sellerIds, status: 'active', payment_status: 'paid', end_date: { [db.Sequelize.Op.gt]: start } }, raw: true, ...opts
  })).map((row) => row.user_id));
  const newSellerIds = sellerIds.filter((id) => !entitled.has(id));
  if (apply && newSellerIds.length) {
    await db.UserSubscription.bulkCreate(newSellerIds.map((user_id) => ({
      user_id, plan_id: pkg.id, start_date: start, end_date: end, status: 'active', payment_status: 'paid'
    })), opts);
  }
  report.user_subscriptions = { created: apply ? newSellerIds.length : newSellerIds.length + owners.length, reused: entitled.size };

  // Listings: matched by shop + SKU, or by active identity (shop, variant, colour, condition).
  const skuKey = (row) => `${row.shop_id}|${lower(row.merchant_sku)}`;
  const current = await db.SellerListing.findAll({ attributes: ['id', 'shop_id', 'merchant_sku', 'active_identity'], raw: true, ...opts });
  const bySku = new Map(current.map((row) => [skuKey(row), row.id]));
  const byIdentity = new Map(current.filter((row) => row.active_identity).map((row) => [row.active_identity, row.id]));
  const listings = new Map();
  const added = [];
  const used = new Set();
  for (const row of remap(loadSeedTable('seller_listings'), { shop_id: shops, device_variant_id: variants })) {
    let identity = listingIdentity(row);
    const match = bySku.get(skuKey(row)) ?? byIdentity.get(identity);
    if (match != null) { listings.set(row.id, match); continue; }
    // The dump allows the same offer at two prices; the model does not, so the repeat keeps a price suffix.
    if (identity && used.has(identity)) identity += `:${row.currency}:${row.price.toFixed(2)}`;
    if (identity) used.add(identity);
    added.push({ ...row, active_identity: identity });
  }
  await insert(db.SellerListing, added);
  report.seller_listings = { created: added.length, reused: listings.size };
  const saved = apply && added.length ? await existingIds(db.SellerListing, ['shop_id', 'merchant_sku'], skuKey) : new Map();
  for (const row of added) listings.set(row.id, saved.get(skuKey(row)) ?? `new:${row.id}`);

  const links = loadSeedTable('seller_listing_categories').map((row) => [listings.get(row.listing_id), categories.get(row.category_id)]);
  const [linked] = await db.sequelize.query('SELECT listing_id, category_id FROM seller_listing_categories', opts);
  const haveLinks = new Set(linked.map((row) => `${row.listing_id}|${row.category_id}`));
  const newLinks = links.filter((link) => !haveLinks.has(link.join('|')));
  if (apply && newLinks.length) {
    await db.sequelize.query(`INSERT INTO seller_listing_categories (listing_id, category_id) VALUES ${newLinks.map(() => '(?, ?)').join(', ')}`,
      { replacements: newLinks.flat(), ...opts });
  }
  report.seller_listing_categories = { created: newLinks.length, reused: links.length - newLinks.length };

  await seedMedia(db.ListingImage, remap(loadSeedTable('listing_images'), { listing_id: listings }), 'listing_id');
  return report;
}
