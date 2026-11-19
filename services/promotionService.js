import { Op } from 'sequelize';
import db from '../models/index.js';
import { PROMOTION_FIELDS, MEDIA_FIELDS, slugify, validatePromotion } from '../utils/promotion.js';

const { Promotion, PromotionDevice, PromotionShop, Device, Shop, sequelize } = db;

const deviceAttributes = ['id', 'slug', 'name', 'primary_image_url', 'is_active'];

/** Full include tree used by public + admin reads. */
export const PROMOTION_INCLUDE = [
  {
    model: PromotionDevice,
    as: 'deviceLinks',
    separate: true,
    order: [['sortOrder', 'ASC']],
    include: [{ model: Device, as: 'device', attributes: deviceAttributes }]
  },
  {
    model: PromotionShop,
    as: 'shopLinks',
    separate: true,
    order: [['sortOrder', 'ASC']],
    include: [{ model: Shop, as: 'shop' }]
  },
  { model: Device, as: 'anchorDevice', attributes: deviceAttributes }
];

export class PromotionValidationError extends Error {
  constructor(errors) {
    super('Promotion validation failed');
    this.errors = errors;
  }
}

function activeWindow(now = new Date()) {
  return {
    [Op.and]: [
      { [Op.or]: [{ startsAt: null }, { startsAt: { [Op.lte]: now } }] },
      { [Op.or]: [{ endsAt: null }, { endsAt: { [Op.gte]: now } }] }
    ]
  };
}

/** Published promotions whose schedule includes "now", highest priority first. */
export async function findActive({ placement, campaignSlug } = {}) {
  const where = { status: 'published', ...activeWindow() };
  if (placement) where.placement = placement;
  if (campaignSlug) where.targetCampaignSlug = campaignSlug;
  return Promotion.findAll({
    where,
    include: PROMOTION_INCLUDE,
    order: [['priority', 'DESC'], ['createdAt', 'DESC']]
  });
}

export async function findActiveBySlug(slug) {
  return Promotion.findOne({
    where: { slug, status: 'published', ...activeWindow() },
    include: PROMOTION_INCLUDE
  });
}

export async function findById(id) {
  return Promotion.findByPk(id, { include: PROMOTION_INCLUDE });
}

// ─── Input handling ─────────────────────────────────────────────────────────

const REQUIRED = new Set(['internalName', 'headline', 'placement', 'layout', 'theme']);

/** Pick known fields from a request body (camelCase). Media may be "url" or { url, alt }. */
export function pickPromotionInput(body = {}) {
  const data = {};
  for (const field of PROMOTION_FIELDS) {
    if (body[field] === undefined) continue;
    let value = body[field];
    if (typeof value === 'string') value = value.trim();
    if (value === '' && !REQUIRED.has(field)) value = null;
    data[field] = value;
  }
  for (const media of MEDIA_FIELDS) {
    const value = body[media];
    if (value === undefined) continue;
    if (value === null || value === '') {
      data[`${media}Url`] = null;
    } else if (typeof value === 'string') {
      data[`${media}Url`] = value.trim();
    } else if (typeof value === 'object') {
      if (value.url !== undefined) data[`${media}Url`] = value.url || null;
      if (value.alt !== undefined) data[`${media}Alt`] = value.alt || null;
    }
  }
  if (data.groupOrder != null) data.groupOrder = parseInt(data.groupOrder, 10) || 0;
  if (data.priority != null) data.priority = parseInt(data.priority, 10);
  if (data.priority != null && Number.isNaN(data.priority)) data.priority = 50;
  if (data.anchorDeviceId != null) data.anchorDeviceId = parseDeviceId(data.anchorDeviceId);
  if (data.showCountdown != null) data.showCountdown = data.showCountdown === true || data.showCountdown === 'true';
  if (data.targetShopId != null) data.targetShopId = String(data.targetShopId);
  if (data.slug) data.slug = slugify(data.slug);
  return data;
}

/** Accepts 12, "12", "device:12" or { id: 12 }. */
function parseDeviceId(value) {
  const raw = typeof value === 'object' && value ? value.id ?? value.externalId : value;
  const n = parseInt(String(raw).replace(/^device:/, ''), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parseIdList(value, parser = (v) => parseInt(typeof v === 'object' && v ? v.id : v, 10)) {
  if (value === undefined) return undefined;
  if (value === null) return [];
  const list = Array.isArray(value) ? value : String(value).split(',');
  const ids = list.map(parser).filter((n) => Number.isInteger(n) && n > 0);
  return [...new Set(ids)];
}

export function pickRelationInput(body = {}) {
  return {
    deviceIds: parseIdList(body.deviceIds, parseDeviceId),
    secondaryDeviceIds: parseIdList(body.secondaryDeviceIds, parseDeviceId),
    shopIds: parseIdList(body.shopIds)
  };
}

async function activeDeviceIds(ids, transaction) {
  if (!ids?.length) return [];
  const rows = await Device.findAll({ where: { id: ids, is_active: true }, attributes: ['id'], transaction });
  const found = new Set(rows.map((r) => r.id));
  return ids.filter((id) => found.has(id));
}

async function activeShopIds(ids, transaction) {
  if (!ids?.length) return [];
  const rows = await Shop.findAll({ where: { id: ids, status: 'active' }, attributes: ['id'], transaction });
  const found = new Set(rows.map((r) => r.id));
  return ids.filter((id) => found.has(id));
}

export async function uniqueSlug(base, excludeId = null, transaction) {
  const root = slugify(base) || `promotion-${Date.now()}`;
  let candidate = root;
  for (let i = 2; i < 500; i++) {
    const where = { slug: candidate };
    if (excludeId) where.id = { [Op.ne]: excludeId };
    const clash = await Promotion.findOne({ where, attributes: ['id'], transaction });
    if (!clash) return candidate;
    candidate = `${root}-${i}`.slice(0, 191);
  }
  return `${root}-${Date.now()}`;
}

async function syncRelations(promotion, relations, transaction) {
  const { deviceIds, secondaryDeviceIds, shopIds } = relations;
  const replaceDevices = async (role, ids) => {
    if (ids === undefined) return;
    await PromotionDevice.destroy({ where: { promotionId: promotion.id, role }, transaction });
    if (ids.length) {
      await PromotionDevice.bulkCreate(
        ids.map((deviceId, sortOrder) => ({ promotionId: promotion.id, deviceId, role, sortOrder })),
        { transaction }
      );
    }
  };
  await replaceDevices('primary', deviceIds);
  await replaceDevices('secondary', secondaryDeviceIds);
  if (shopIds !== undefined) {
    await PromotionShop.destroy({ where: { promotionId: promotion.id }, transaction });
    if (shopIds.length) {
      await PromotionShop.bulkCreate(
        shopIds.map((shopId, sortOrder) => ({ promotionId: promotion.id, shopId, sortOrder })),
        { transaction }
      );
    }
  }
}

function currentRelationIds(existing) {
  const current = existing ? existing.get({ plain: true }) : {};
  const links = current.deviceLinks || [];
  return {
    deviceIds: links.filter((l) => l.role === 'primary').map((l) => l.deviceId),
    secondaryDeviceIds: links.filter((l) => l.role === 'secondary').map((l) => l.deviceId),
    shopIds: (current.shopLinks || []).map((l) => l.shopId)
  };
}

/** Resolve relation ids to active records and validate the merged record. */
async function resolveAndValidate(merged, relations, existing, transaction) {
  const current = currentRelationIds(existing);
  const resolved = {
    deviceIds: await activeDeviceIds(relations.deviceIds ?? current.deviceIds, transaction),
    secondaryDeviceIds: await activeDeviceIds(relations.secondaryDeviceIds ?? current.secondaryDeviceIds, transaction),
    shopIds: await activeShopIds(relations.shopIds ?? current.shopIds, transaction)
  };
  const anchor = merged.anchorDeviceId ? await activeDeviceIds([merged.anchorDeviceId], transaction) : [];

  const errors = validatePromotion(merged, {
    devices: resolved.deviceIds.length,
    shops: resolved.shopIds.length,
    anchorDevice: anchor.length
  });
  if (merged.anchorDeviceId && !anchor.length && merged.layout !== 'hero_product') {
    errors.push({ path: 'anchorDeviceId', message: 'Anchor device not found or inactive' });
  }
  if (errors.length) throw new PromotionValidationError(errors);

  // Only persist the relation lists the caller actually sent (filtered to valid ids).
  return {
    deviceIds: relations.deviceIds === undefined ? undefined : resolved.deviceIds,
    secondaryDeviceIds: relations.secondaryDeviceIds === undefined ? undefined : resolved.secondaryDeviceIds,
    shopIds: relations.shopIds === undefined ? undefined : resolved.shopIds
  };
}

function mergedFields(existing, data) {
  const current = existing.get({ plain: true });
  const merged = {};
  for (const f of PROMOTION_FIELDS) merged[f] = current[f];
  return Object.assign(merged, data);
}

export async function createPromotion(body, actorId = null) {
  const data = pickPromotionInput(body);
  const relations = pickRelationInput(body);
  const status = body.status === 'published' ? 'published' : 'draft';

  return sequelize.transaction(async (transaction) => {
    const merged = { presentation: 'standard', imagePosition: 'right', targetType: 'none', secondaryTargetType: 'none', ...data };
    const toSave = await resolveAndValidate(merged, relations, null, transaction);
    merged.slug = await uniqueSlug(data.slug || data.internalName, null, transaction);
    const promotion = await Promotion.create(
      {
        ...merged,
        status,
        publishedAt: status === 'published' ? new Date() : null,
        createdBy: actorId,
        updatedBy: actorId
      },
      { transaction }
    );
    await syncRelations(promotion, toSave, transaction);
    return promotion.id;
  }).then(findById);
}

export async function updatePromotion(id, body, actorId = null) {
  const existing = await findById(id);
  if (!existing) return null;
  const data = pickPromotionInput(body);
  const relations = pickRelationInput(body);

  await sequelize.transaction(async (transaction) => {
    const current = existing.get({ plain: true });
    const toSave = await resolveAndValidate(mergedFields(existing, data), relations, existing, transaction);
    // Slug only changes when explicitly sent, so published URLs stay stable on renames.
    const patch = { ...data, updatedBy: actorId };
    delete patch.slug;
    if (data.slug && data.slug !== current.slug) {
      patch.slug = await uniqueSlug(data.slug, existing.id, transaction);
    }
    if (body.status === 'published' && current.status !== 'published') {
      patch.status = 'published';
      patch.publishedAt = new Date();
    } else if (body.status === 'draft') {
      patch.status = 'draft';
    }
    await existing.update(patch, { transaction });
    await syncRelations(existing, toSave, transaction);
  });
  return findById(id);
}

export async function setStatus(id, status, actorId = null) {
  const existing = await findById(id);
  if (!existing) return null;
  // Re-validate before publishing (devices/shops may have gone inactive since the draft was saved).
  if (status === 'published') await resolveAndValidate(mergedFields(existing, {}), {}, existing);
  await existing.update({
    status,
    publishedAt: status === 'published' ? new Date() : existing.publishedAt,
    updatedBy: actorId
  });
  return findById(id);
}

export async function duplicatePromotion(id, actorId = null) {
  const existing = await findById(id);
  if (!existing) return null;
  const current = existing.get({ plain: true });
  return sequelize.transaction(async (transaction) => {
    const data = mergedFields(existing, {});
    data.internalName = `${current.internalName} (copy)`.slice(0, 120);
    data.slug = await uniqueSlug(`${current.slug}-copy`, null, transaction);
    data.notes = null;
    const copy = await Promotion.create(
      { ...data, status: 'draft', publishedAt: null, createdBy: actorId, updatedBy: actorId },
      { transaction }
    );
    await syncRelations(copy, currentRelationIds(existing), transaction);
    return copy.id;
  }).then(findById);
}
