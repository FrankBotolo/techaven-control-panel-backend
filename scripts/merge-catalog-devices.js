import '../utils/loadEnv.js';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Op } from 'sequelize';
import db from '../models/index.js';
import { planReviewedMerges } from '../services/catalogue/reviewedIdentity.js';
import { enqueueDevice } from '../services/catalogue/promotionSync.js';

const args = process.argv.slice(2);
const approvalPath = args[0] === '--apply' && args[1];
if (args.length && (!approvalPath || args.length !== 2)) {
  throw new Error('Usage: node scripts/merge-catalog-devices.js [--apply reviewed-report.json]');
}
const reviewed = approvalPath ? JSON.parse(await readFile(approvalPath, 'utf8')) : null;
const { sequelize, Device, Brand, DeviceVariant, DeviceMedia, SellerListing, ListingImage } = db;
const digest = (data) => createHash('sha256').update(JSON.stringify(data)).digest('hex');

async function listingSnapshot(variantIds, transaction, lock) {
  const listings = await SellerListing.findAll({
    where: { device_variant_id: variantIds }, transaction, lock, raw: true, order: [['id', 'ASC']],
  });
  const images = await ListingImage.findAll({
    where: { listing_id: listings.map(({ id }) => id) }, transaction, lock, raw: true, order: [['id', 'ASC']],
  });
  return { listings, images };
}

try {
  const report = await sequelize.transaction(async (transaction) => {
    const devices = await Device.findAll({
      where: { is_active: true, slug: { [Op.or]: [{ [Op.like]: '%redmi%' }, { [Op.like]: '%airpods%' }] } }, include: [{ model: Brand, as: 'brand', required: true }],
      transaction, ...(reviewed ? { lock: transaction.LOCK.UPDATE } : {}), order: [['id', 'ASC']],
    });
    const { merges, ambiguous } = planReviewedMerges(devices);
    const lock = reviewed ? transaction.LOCK.UPDATE : undefined;
    const proposals = [];
    const executable = [];
    for (const { source, target, variantFacts } of merges) {
      const variants = await DeviceVariant.findAll({
        where: { device_id: [source.id, target.id] }, transaction, lock, raw: true, order: [['id', 'ASC']],
      });
      const variantIds = variants.map(({ id }) => id);
      const snapshot = await listingSnapshot(variantIds, transaction, lock);
      const sourceVariants = variants.filter((variant) => variant.device_id === source.id);
      const movedVariants = sourceVariants.map(({ id }) => id);
      const affected = snapshot.listings.filter((listing) => movedVariants.includes(listing.device_variant_id));
      const conflict = sourceVariants.some((variant) => Object.entries(variantFacts).some(([key, expected]) =>
        variant[key] != null && String(variant[key]).toUpperCase() !== String(expected).toUpperCase(),
      ));
      if (conflict) {
        ambiguous.push({ source: source.slug, target: target.slug, listingIds: affected.map(({ id }) => id),
          reason: 'A variant conflicts with the reviewed model number, network or storage' });
        continue;
      }
      executable.push({ source, target, variantFacts, variantIds, snapshot });
      proposals.push({
        source: { id: source.id, slug: source.slug },
        canonical: { id: target.id, slug: target.slug },
        movedVariants,
        variantFacts,
        affectedListings: affected.map(({ id, shop_id, condition, price, quantity, status }) => ({ id, shop_id, condition, price, quantity, status,
            image_ids: snapshot.images.filter((image) => image.listing_id === id).map((image) => image.id) })),
        snapshot: digest({ source: source.toJSON(), target: target.toJSON(), variants, ...snapshot }),
      });
    }
    const deviceIds = new Map(devices.map(({ slug, id }) => [slug, id]));
    const ambiguousIds = [...new Set(ambiguous.flatMap(({ source, target }) =>
      [deviceIds.get(source), deviceIds.get(target)].filter(Boolean),
    ))];
    const ambiguousVariants = await DeviceVariant.findAll({
      where: { device_id: ambiguousIds }, attributes: ['id', 'device_id'], transaction, raw: true,
    });
    const ambiguousListings = await SellerListing.findAll({
      where: { device_variant_id: ambiguousVariants.map(({ id }) => id) },
      attributes: ['id', 'device_variant_id'], transaction, raw: true, order: [['id', 'ASC']],
    });
    const variantDevices = new Map(ambiguousVariants.map(({ id, device_id }) => [id, device_id]));
    for (const entry of ambiguous) {
      const ids = [deviceIds.get(entry.source), deviceIds.get(entry.target)];
      entry.listingIds = ambiguousListings.filter((listing) =>
        ids.includes(variantDevices.get(listing.device_variant_id)),
      ).map(({ id }) => id);
    }
    const listingCount = await SellerListing.count({ transaction });
    const approval = digest({ proposals, ambiguous, listingCount });
    if (reviewed) {
      assert.equal(reviewed.applied, false, 'Use an unapplied dry-run report');
      assert.equal(reviewed.approval, approval, 'Catalog changed since the dry run');
      assert.deepEqual(reviewed.proposals, proposals, 'Reviewed proposals were edited');
      for (const { source, target, variantFacts, variantIds, snapshot } of executable) {
        await DeviceVariant.update({ device_id: target.id, ...variantFacts }, { where: { device_id: source.id }, transaction });
        await DeviceMedia.update({ device_id: target.id }, { where: { device_id: source.id }, transaction });
        if (source.primary_image_url && source.primary_image_url !== target.primary_image_url) {
          await DeviceMedia.create({ device_id: target.id, url: source.primary_image_url,
            source: 'canonical-merge', sort_order: 1000 }, { transaction });
        }
        const replacements = { source: source.id, target: target.id };
        await sequelize.query(`
          INSERT INTO device_favorites (user_id, device_id, created_at)
          SELECT source_favorites.user_id, :target, source_favorites.created_at
          FROM device_favorites AS source_favorites WHERE source_favorites.device_id = :source
          ON DUPLICATE KEY UPDATE created_at = LEAST(device_favorites.created_at, source_favorites.created_at)
        `, { transaction, replacements });
        await sequelize.query('DELETE FROM device_favorites WHERE device_id = :source', { transaction, replacements });
        await source.update({ is_active: false, canonical_device_id: target.id }, { transaction });
        await enqueueDevice(source.id, { transaction, reason: 'canonical-alias' });
        assert.deepEqual(await listingSnapshot(variantIds, transaction, lock), snapshot, 'Listing records changed during merge');
      }
      for (const targetId of new Set(executable.map(({ target }) => target.id))) {
        await enqueueDevice(targetId, { transaction, reason: `canonical-merge:${approval}` });
      }
      assert.equal(await SellerListing.count({ transaction }), listingCount);
      const remaining = planReviewedMerges(devices).merges;
      assert.ok(executable.every(({ source }) => !remaining.some((merge) => merge.source.id === source.id)));
    }
    return { applied: Boolean(reviewed), listingCount, approval, proposals, ambiguous };
  });
  console.log(JSON.stringify(report, null, 2));
} finally {
  await sequelize.close();
}
