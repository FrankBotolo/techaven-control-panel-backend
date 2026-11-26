import '../utils/loadEnv.js';
import fs from 'node:fs';
import db from '../models/index.js';
import { planStoreStock, rewriteMedia } from '../services/catalogue/store-stock-import.js';
import { enqueueDevice, enqueueShop } from '../services/catalogue/promotionSync.js';

const args = process.argv.slice(2), input = args[0];
const value = name => { const at = args.indexOf(name); return at >= 0 ? args[at + 1] : undefined; };
const reportPath = value('--report'), mediaBase = value('--media-base');
if (!input || !reportPath || !mediaBase) throw new Error('Usage: node scripts/import-store-stock.js <bundle.json> --report <new-private-report.json> --media-base <HTTPS-upload-base> [--apply] [--allow-held]');
if (fs.existsSync(reportPath)) throw new Error('Choose a new report path; reports are never overwritten');
const mediaUrl = new URL(mediaBase);
if (mediaUrl.protocol !== 'https:' || mediaUrl.username || mediaUrl.password || mediaUrl.search || mediaUrl.hash) throw new Error('Media base must be a public HTTPS URL');
const apply = args.includes('--apply');
const bundle = rewriteMedia(JSON.parse(fs.readFileSync(input, 'utf8')), mediaBase);
let failed = false, completedReport;
try {
  await db.sequelize.transaction({ isolationLevel: 'SERIALIZABLE' }, async transaction => {
    const get = model => model.findAll({ raw: true, transaction, order: [['id', 'ASC']] });
    const shops = await get(db.Shop), listings = await get(db.SellerListing), devices = await get(db.Device), variants = await get(db.DeviceVariant);
    const colors = await get(db.DeviceVariantColor), colorNames = await get(db.Color);
    const target = { shops, listings, devices, variants, colors: colors.map(row => ({ ...row, color_slug: colorNames.find(name => name.id === row.color_id)?.slug })) };
    const plan = planStoreStock(bundle, target);
    const report = { applied: false, fingerprint: plan.fingerprint, source_shops: bundle.shops.length, source_listings: bundle.listings.length,
      new_shops: plan.shops.length, new_listings: plan.listings.length, existing_listings: plan.existing.length, held: plan.held };
    if (apply && plan.held.length && !args.includes('--allow-held')) {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
      throw new Error('Held listings require review. Database unchanged; review report before using --allow-held for a partial import.');
    }
    if (apply) {
      const shopIds = new Map();
      for (const item of plan.shops) {
        const shop = await db.Shop.create(item.values, { transaction });
        shopIds.set(item.planned_id, shop.id);
        await enqueueShop(shop.id, { transaction, reason: `stock-import:${plan.fingerprint.slice(0, 16)}` });
      }
      const deviceIds = new Set();
      for (const item of plan.listings) {
        const listing = await db.SellerListing.create({ ...item.values,
          shop_id: shopIds.get(item.shop_id) ?? item.shop_id,
          device_variant_id: item.device_variant_id, device_variant_color_id: item.device_variant_color_id }, { transaction });
        for (const image of item.images) await db.ListingImage.create({ ...image, listing_id: listing.id }, { transaction });
        deviceIds.add(item.device_id);
      }
      for (const id of deviceIds) await enqueueDevice(id, { transaction, reason: `stock-import:${plan.fingerprint.slice(0, 16)}` });
    }
    // Reports describe a successful commit only after the transaction completes.
    completedReport = { ...report, applied: apply };
  });
  fs.writeFileSync(reportPath, JSON.stringify(completedReport, null, 2), { flag: 'wx', mode: 0o600 });
  const report = completedReport;
  console.log(JSON.stringify({ applied: report.applied, source_shops: report.source_shops, source_listings: report.source_listings,
    new_shops: report.new_shops, new_listings: report.new_listings, existing_listings: report.existing_listings, held: report.held.length, report: reportPath }));
} catch (error) { console.error(error.message); failed = true; }
finally { await db.sequelize.close(); }
if (failed) process.exitCode = 1;
