import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import db from '../models/index.js';
import { listingIdentity } from '../models/SellerListing.js';

const [input, sourceRoot, mode] = process.argv.slice(2);
assert(input && sourceRoot && ['--dry-run', '--apply'].includes(mode));
assert(['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOST));
const apply = mode === '--apply';
const data = JSON.parse(await readFile(input, 'utf8'));
assert.equal(data.shops.length, 21);
const { sequelize, Shop, Device, DeviceVariant, Category, Brand, SellerListing } = db;
const normalize = value => value.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g, '');
const slug = value => value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 32);
const stripBrand = value => value.replace(/^(apple|google|samsung|xiaomi)\s+/i, '');
const report = { shops: [], created: { shops: 0, devices: 0, variants: 0, offers: 0 }, promoted: [], existingOffers: 0, backfilled: 0, held: [], duplicates: 0, pricePairs: [] };

function productName(row) {
  return row.product
    .replace(/\(N\)$/i, '')
    .replace(/Google Pixel 7 Pro 128G$/i, 'Google Pixel 7 Pro')
    .replace(/^Lenovo L380 Yoga$/i, 'Lenovo ThinkPad L380 Yoga')
    .replace(/^HP EliteBook 735 G6.*$/i, 'HP EliteBook 735 G6')
    .replace(/^MacBook Pro 2019, i5$/i, 'MacBook Pro 2019')
    .trim();
}

function categoryOf(name) {
  if (/replacement|screen protector|phone cases?|\bcases?$/i.test(name)) return 'Phone Accessories';
  if (/charger|charging cable|usb-c|power cable|power bank|laptop stand/i.test(name)) return 'Accessories';
  if (/iphone|galaxy|pixel|redmi|huawei|oppo|realme|nubia|itel|nokia|tecno/i.test(name) && !/watch/i.test(name)) return 'Smartphones';
  if (/thinkpad|latitude|elitebook|probook|pavilion|surface|macbook|dragonfly|aspire|yoga|100e/i.test(name)) return 'Laptops';
  if (/eliteone/i.test(name)) return 'Desktop Computers';
  if (/watch|skmei/i.test(name)) return 'Smartwatches';
  if (/playstation/i.test(name)) return 'Gaming';
  if (/\bTV\b/i.test(name)) return 'Televisions';
  if (/refrigerator|freezer|\bfan\b/i.test(name)) return 'Home Appliances';
  if (/soundbar|jbl|buds|spacebox/i.test(name)) return 'Audio';
  return 'Electronics';
}

function configuration(row) {
  const raw = row.configuration.toLowerCase();
  const ram = raw.match(/(\d+)\s*(?:\+\s*\d+\s*)?gb\s*(?:ddr\d\s*)?ram/)?.[1];
  const sizes = [...raw.matchAll(/(\d+)\s*(gb|tb)\b(?!\s*(?:ddr\d\s*)?ram)/g)];
  const storage = sizes.length === 1 ? Number(sizes[0][1]) * (sizes[0][2] === 'tb' ? 1024 : 1) : null;
  const cpu = raw.match(/(?:core\s*)?i[3579](?:-\d+[a-z]*)?|ryzen\s*\d(?:\s*pro)?(?:,?\s*\d{4}u)?|celeron|pentium silver/)?.[0].replace(/^core\s*/, '');
  const generation = raw.match(/\d{1,2}(?:st|nd|rd|th)\s+gen/)?.[0];
  const network = raw.match(/\b[45]g\b/)?.[0].toUpperCase();
  return { ram: ram ? Number(ram) : null, storage, cpu, generation, network, region: /\busa?\b/.test(raw) ? 'USA' : null,
    sim: /esim only/.test(raw) ? 'eSIM' : /single sim/.test(raw) ? 'Single SIM' : null,
    media: raw.match(/\b(?:ssd|hdd)\b/)?.[0], touch: /touchscreen/.test(raw) || undefined };
}

function reason(row, name) {
  if (!row.price_mwk) return row.price_status;
  if (/expired|promo through|advertised promo/.test(row.review)) return 'Promotion price requires current confirmation';
  if (/replacement/i.test(name) && /repair service/i.test(row.review)) return 'Repair service';
  if (/model to confirm|generation to confirm|model conflict|\(advertised\)|iphone 18|^acer aspire$|redmi a1 \/ a2|^multi-system vehicle diagnostic scanner$/i.test(name)) return 'Confirm exact model';
  if (/^latitude 7280$/i.test(name.replace(/^dell /i, '')) && /8th gen/i.test(row.configuration)) return 'Confirm CPU and model';
  if (/^Google Pixel 9 Pro XL$/i.test(name) && /12\s*gb ram/i.test(row.configuration)) return 'Advertised RAM conflicts with manufacturer specification';
  return null;
}

function listingCondition(text) {
  if (/^open box/i.test(text)) return 'open_box';
  if (/^refurbished/i.test(text)) return 'refurbished';
  if (/^(new|sealed)(?:\b|,)/i.test(text)) return 'new';
  return 'used';
}

const tx = await sequelize.transaction();
try {
  const options = { transaction: tx };
  const shops = await Shop.findAll(options);
  const devices = await Device.findAll({ attributes: ['id', 'name', 'slug', 'canonical_device_id', 'is_active'], raw: true, ...options });
  const variants = await DeviceVariant.findAll({ raw: true, ...options });
  const current = await SellerListing.findAll({ order: [['id','ASC']], ...options });
  const byId = new Map(devices.map(device => [device.id, device]));
  const variantsByDevice = Map.groupBy(variants, item => item.device_id);
  const lookup = new Map();
  function index(device, name) {
    for (const label of [name, stripBrand(name.replaceAll('-', ' '))]) {
      const key = normalize(label);
      if (!lookup.has(key)) lookup.set(key, new Set());
      lookup.get(key).add(device.id);
    }
  }
  for (const entry of devices) {
    let device = entry;
    const seen = new Set();
    while (device?.canonical_device_id && !seen.has(device.id)) {
      seen.add(device.id);
      device = byId.get(device.canonical_device_id);
    }
    if (device?.is_active && !device.canonical_device_id) {
      index(device, entry.name);
      index(device, entry.slug);
    }
  }
  const sourceShops = new Map();
  const shopFacts = {
    'blueprint electronics': { location: 'Blantyre', address: 'Trade Fair Grounds, Stand 21' },
    'CI Electronics': { location: 'Lilongwe', address: 'Bluefin Mall, Room 21, Area 47 SANA' },
    'etchee electronics': { location: 'Blantyre' },
    'Games & Stuff Electronics Malawi': { location: 'Lilongwe', address: 'Area 13, City Centre, Simso Filling Station' }
  };
  for (const spec of data.shops) {
    const peers = shops.filter(shop => normalize(shop.name) === normalize(spec.shop));
    assert(peers.length <= 1, 'Duplicate shop identity: ' + spec.shop);
    const name = spec.shop.replace(/\b\p{Ll}/gu, c => c.toUpperCase());
    let shop = peers[0];
    if (!shop) {
      shop = await Shop.create({ name, status: 'active', application_status: 'approved' }, options);
      report.created.shops++;
    }
    const values = { status: 'active', application_status: 'approved', ...shopFacts[spec.shop] };
    if (spec.logo) {
      const file = path.resolve(sourceRoot, spec.logo);
      assert(path.relative(path.resolve(sourceRoot), file).split(path.sep)[0] !== '..');
      const logo = digest(spec.logo) + '.jpg';
      const folder = path.resolve('uploads', 'onboarding-20261117');
      if (apply) {
        await mkdir(folder, { recursive: true });
        await copyFile(file, path.join(folder, logo));
      } else await readFile(file);
      values.logo = (process.env.SEED_MEDIA_BASE || 'http://localhost:8000') + '/uploads/onboarding-20261117/' + logo;
    }
    await shop.update(values, options);
    sourceShops.set(spec.shop, shop);
    report.shops.push({ id: shop.id, name: shop.name, active: shop.status === 'active' });
  }

  const targetIds = new Set([...sourceShops.values()].map(shop => shop.id));
  const protectedFields = listing => [listing.id, listing.price, listing.quantity, listing.status];
  const before = digest(current.filter(row => !targetIds.has(row.shop_id)).map(protectedFields));
  const skuIndex = new Map();
  const activeIndex = new Map();
  for (const listing of current) {
    const key = listingIdentity(listing);
    if (key !== listing.active_identity) {
      await SellerListing.update({ active_identity: key }, { where: { id: listing.id }, hooks: false, silent: true, ...options });
      listing.setDataValue('active_identity', key);
      report.backfilled++;
    }
    if (key) {
      assert(!activeIndex.has(key), 'Duplicate active listing identity: ' + key);
      activeIndex.set(key, listing);
    }
    if (listing.merchant_sku) skuIndex.set(listing.shop_id + ':' + listing.merchant_sku, listing);
  }

  const seen = new Set();
  const imported = new Map();
  for (const row of data.offers) {
    const name = productName(row);
    const hold = reason(row, name);
    const defer = message => report.held.push({ shop: row.shop, product: name, price: row.price_mwk, reason: message, source: row.source });
    if (hold) { defer(hold); continue; }
    const shop = sourceShops.get(row.shop);
    assert(shop);
    const categoryName = categoryOf(name);
    const cfg = configuration(row);
    const condition = listingCondition(row.condition);
    const browser = normalize(name);
    const exact = new Set([...(lookup.get(browser) || []), ...(lookup.get(normalize(stripBrand(name))) || [])]);
    if (!exact.size && row.device_id && byId.get(Number(row.device_id))?.is_active) {
      const snapshot = byId.get(Number(row.device_id));
      if (!snapshot.canonical_device_id && [snapshot.name, snapshot.slug].some(label => normalize(stripBrand(label.replaceAll('-', ' '))) === normalize(stripBrand(name)))) exact.add(snapshot.id);
    }
    if (exact.size > 1) {
      const snapshotId = Number(row.device_id);
      const verifiedVariant = (variantsByDevice.get(snapshotId) || []).some(item =>
        item.id === Number(row.variant_id) && item.is_active && item.storage_gb === cfg.storage);
      const exactSlugs = [...exact].filter(id => {
        const candidate = byId.get(id);
        return [slug(name), slug(stripBrand(name))].includes(candidate.slug);
      });
      if (exact.has(snapshotId) && verifiedVariant) {
        exact.clear();
        exact.add(snapshotId);
      } else if (exactSlugs.length === 1) {
        exact.clear();
        exact.add(exactSlugs[0]);
      }
    }
    if (exact.size > 1) { defer('Multiple catalogue devices: ' + [...exact].join(', ')); continue; }
    let device = exact.size ? byId.get([...exact][0]) : null;
    if (!device && categoryName === 'Smartphones' && !/^(?:Nokia 106|Tecno T102)$/i.test(name)) { defer('Phone identity requires catalogue or manufacturer confirmation'); continue; }
    if (!device && /^(?:Samsung Smart TV|Hisense Smart TV|LG Fan)$/i.test(name)) { defer('Model or size missing'); continue; }
    if (!device) {
      const [category] = await Category.findOrCreate({ where: { name: categoryName, shop_id: null }, defaults: { status: 'approved' }, ...options });
      const known = name.match(/^(Apple|Google|Samsung|Xiaomi|Nokia|Tecno|Huawei|Dell|HP|Lenovo|Microsoft|Sony|Hisense|Defy|Geepas|Oraimo|JBL|LG|ECCO|SKMEI|Kada|Kingbolen|Launch|UNIGRO|Aiwa|Acer|Toshiba)\b/i)?.[0] || (/^(?:iPhone|MacBook)/i.test(name) ? 'Apple' : 'Unbranded');
      const [brand] = await Brand.findOrCreate({ where: { slug: slug(known) }, defaults: { name: known }, ...options });
      const [record, created] = await Device.findOrCreate({ where: { slug: slug(name) }, defaults: { name, brand_id: brand.id, category_id: category.id, source_metadata: { seller_evidence: row.source } }, ...options });
      device = record.get({ plain: true });
      if (created) { report.created.devices++; (report.newDevices ??= []).push(name); }
      assert(device.is_active && !device.canonical_device_id);
      byId.set(device.id, device);
      index(device, device.name);
      index(device, device.slug);
    }

    const pool = (variantsByDevice.get(device.id) || []).filter(item => item.is_active);
    const snapshot = pool.find(item => item.id === Number(row.variant_id) && (!cfg.storage || cfg.storage === item.storage_gb) && (!cfg.ram || cfg.ram === Number(item.ram_gb)));
    const info = item => JSON.stringify([item.canonical_key, item.attributes]).toLowerCase();
    const capacityMatches = pool.filter(item =>
      (!cfg.storage || cfg.storage === item.storage_gb) && (!cfg.ram || cfg.ram === Number(item.ram_gb)) &&
      (!cfg.network || cfg.network === item.network_generation?.toUpperCase()) &&
      (!cfg.region || /^(usa?|united states)$/i.test(item.region || '')) &&
      (!cfg.sim || normalize(cfg.sim) === normalize(item.sim_type || '')));
    const compatible = capacityMatches.filter(item =>
      (!cfg.cpu || info(item).includes(cfg.cpu)) && (!cfg.generation || info(item).includes(cfg.generation) || /\bi[3579]-\d/i.test(info(item))) &&
      (!cfg.media || info(item).includes(cfg.media)));
    const buildKey = device.slug + '|seller-config|' + digest(cfg);
    let variant = snapshot || compatible.find(item => item.canonical_key === buildKey)
      || (compatible.length === 1 ? compatible[0] : null);
    if (!variant && compatible.length > 1) {
      const generic = compatible.filter(item => !item.region && !item.sim_type && !item.model_number);
      if (generic.length === 1) variant = generic[0];
      else { defer('Multiple configurations match: ' + compatible.map(item => item.id).join(', ')); continue; }
    }
    if (!variant && categoryName === 'Smartphones' && !/^(?:Nokia 106|Tecno T102)$/i.test(name) && (!cfg.storage || capacityMatches.length || /^(?:Oppo A56 5G|Google Pixel 9 Pro XL)$/i.test(name))) {
      defer('Confirm phone storage, RAM, or regional model'); continue;
    }
    if (!variant && categoryName === 'Laptops' && pool.length && capacityMatches.length) {
      defer('Confirm exact processor, form factor, or storage type'); continue;
    }
    if (!variant) {
      const [record, created] = await DeviceVariant.findOrCreate({
        where: { canonical_key: buildKey },
        defaults: { device_id: device.id, storage_gb: cfg.storage, ram_gb: cfg.ram, network_generation: cfg.network,
          region: cfg.region, sim_type: cfg.sim, attributes: { seller_configuration: cfg }, source_metadata: { seller_evidence: row.source } }, ...options,
      });
      variant = record.get({ plain: true });
      if (created) {
        report.created.variants++;
        variantsByDevice.set(device.id, [...(variantsByDevice.get(device.id) || []), variant]);
      }
    }

    const battery = row.configuration.match(/\d{2,3}\s*%/)?.[0]?.replace(/\s/g, '');
    const unit = [battery, row.configuration.match(/porcelain|purple|bay|black|light scratches/i)?.[0]?.toLowerCase()].filter(Boolean).join('-');
    const stable = [shop.id, variant.id, condition, Number(row.price_mwk), unit];
    const sku = 'seed-20261117-' + digest(stable);
    const repeat = stable.join(':');
    if (seen.has(repeat)) { report.duplicates++; continue; }
    seen.add(repeat);
    const details = { source_evidence: row.source, seller_configuration: row.configuration,
      condition_details: row.condition || null, condition_defaulted: !row.condition, ...(unit ? { seed_unit: unit } : {}) };
    const values = { shop_id: shop.id, device_variant_id: variant.id, merchant_sku: sku, condition, currency: 'MWK',
      price: row.price_mwk, quantity: 1, status: 'active', details };
    const key = listingIdentity(values);
    const legacy = shop.name.toLowerCase() === 'teez tech' && row.variant_id
      ? skuIndex.get(shop.id + ':seed-20261117-teez-' + row.variant_id + '-' + condition) : null;
    const matchingDraft = legacy?.status === 'draft' && Number(legacy.price) === Number(row.price_mwk) && legacy.device_variant_id === variant.id ? legacy : null;
    const existing = skuIndex.get(shop.id + ':' + sku) || activeIndex.get(key);
    let listing;
    if (existing) { listing = existing; report.existingOffers++; }
    else if (matchingDraft) { listing = await matchingDraft.update({ ...values, active_identity: key, published_at: new Date() }, options); report.promoted.push(listing.id); }
    else { listing = await SellerListing.create(values, options); report.created.offers++; }
    activeIndex.set(key, listing);
    imported.set(listing.id, { id: listing.id, shop: shop.name, variant: variant.id, price: Number(listing.price), quantity: listing.quantity, status: listing.status, existing: Boolean(existing) });
  }
  for (const shop of sourceShops.values()) {
    const count = await SellerListing.count({ where: { shop_id: shop.id, status: 'active' }, ...options });
    await shop.update({ total_products: count }, options);
  }
  const after = await SellerListing.findAll({ order: [['id','ASC']], ...options });
  assert.equal(digest(after.filter(row => !targetIds.has(row.shop_id)).map(protectedFields)), before);
  assert.equal(report.shops.filter(shop => shop.active).length, 21);
  assert([...imported.values()].every(row => row.status === 'active' && (row.existing || row.quantity === 1)));
  report.pricePairs = [...Map.groupBy(imported.values(), row => row.shop + ':' + row.variant).values()]
    .filter(items => new Set(items.map(row => row.price)).size > 1).map(items => items.map(({ id, price, shop }) => ({ id, price, shop })));
  report.imported = imported.size;
  if (apply) await tx.commit();
  else await tx.rollback();
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  if (!tx.finished) await tx.rollback();
  throw error;
} finally {
  await sequelize.close();
}
