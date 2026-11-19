import { Op } from 'sequelize';
import db from '../models/index.js';
import { logAudit, auditContext } from '../utils/audit.js';
import * as PromotionService from '../services/promotionService.js';
import {
  PLACEMENTS,
  LAYOUTS,
  PRESENTATIONS,
  IMAGE_POSITIONS,
  THEMES,
  TARGET_TYPES,
  STATUSES,
  PREVIEW_TTL_MS,
  isActiveAt,
  normalizePromotion,
  publicBaseUrl,
  signPromotionPreview,
  previewSecret,
  toAdminPromotion
} from '../utils/promotion.js';

const { Promotion } = db;

function handleError(res, error, label) {
  if (error instanceof PromotionService.PromotionValidationError) {
    return res.status(422).json({ success: false, message: error.message, errors: error.errors });
  }
  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ success: false, message: 'A promotion with that slug already exists' });
  }
  console.error(`Admin ${label} promotion error:`, error);
  return res.status(500).json({ success: false, message: `Failed to ${label} promotion`, error: error.message });
}

const audit = (req, action, promotion) =>
  logAudit({
    ...auditContext(req),
    action: `admin.promotion.${action}`,
    actor_user_id: req.user.id,
    target_type: 'promotion',
    target_id: promotion.id,
    metadata: { slug: promotion.slug, placement: promotion.placement, status: promotion.status }
  });

/** GET /api/admin/promotions/options — enum values for building the editor UI. */
export const options = (req, res) =>
  res.json({
    success: true,
    data: {
      placements: PLACEMENTS,
      layouts: LAYOUTS,
      presentations: PRESENTATIONS,
      imagePositions: IMAGE_POSITIONS,
      themes: THEMES,
      targetTypes: TARGET_TYPES,
      statuses: STATUSES
    }
  });

/**
 * GET /api/admin/promotions
 * Query: placement, layout, status, live=true|false, q (search), page, limit
 */
export const list = async (req, res) => {
  try {
    const { placement, layout, status, live, q } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

    const where = {};
    if (placement) where.placement = placement;
    if (layout) where.layout = layout;
    if (status) where.status = status;
    if (q) {
      const like = { [Op.like]: `%${q}%` };
      where[Op.or] = [{ internalName: like }, { headline: like }, { slug: like }];
    }

    let rows;
    let count;
    if (live === 'true' || live === 'false') {
      // Schedule check done in JS so it shares logic with the public feed.
      const all = await Promotion.findAll({ where, include: PromotionService.PROMOTION_INCLUDE, order: [['priority', 'DESC'], ['createdAt', 'DESC']] });
      const wantLive = live === 'true';
      const filtered = all.filter((p) => (p.status === 'published' && isActiveAt(p)) === wantLive);
      count = filtered.length;
      rows = filtered.slice((page - 1) * limit, page * limit);
    } else {
      count = await Promotion.count({ where });
      rows = await Promotion.findAll({
        where,
        include: PromotionService.PROMOTION_INCLUDE,
        order: [['placement', 'ASC'], ['priority', 'DESC'], ['createdAt', 'DESC']],
        limit,
        offset: (page - 1) * limit
      });
    }

    return res.json({
      success: true,
      data: rows.map(toAdminPromotion),
      pagination: { page, limit, total: count, total_pages: Math.ceil(count / limit) }
    });
  } catch (error) {
    return handleError(res, error, 'list');
  }
};

/** GET /api/admin/promotions/:id */
export const getOne = async (req, res) => {
  try {
    const row = await PromotionService.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Promotion not found' });
    return res.json({ success: true, data: { ...toAdminPromotion(row), rendered: normalizePromotion(row) } });
  } catch (error) {
    return handleError(res, error, 'fetch');
  }
};

/** POST /api/admin/promotions */
export const create = async (req, res) => {
  try {
    const row = await PromotionService.createPromotion(req.body, req.user.id);
    await audit(req, 'create', row);
    return res.status(201).json({ success: true, message: 'Promotion created successfully', data: toAdminPromotion(row) });
  } catch (error) {
    return handleError(res, error, 'create');
  }
};

/** PATCH /api/admin/promotions/:id */
export const update = async (req, res) => {
  try {
    const row = await PromotionService.updatePromotion(req.params.id, req.body, req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'Promotion not found' });
    await audit(req, 'update', row);
    return res.json({ success: true, message: 'Promotion updated successfully', data: toAdminPromotion(row) });
  } catch (error) {
    return handleError(res, error, 'update');
  }
};

/** POST /api/admin/promotions/:id/publish */
export const publish = async (req, res) => {
  try {
    const row = await PromotionService.setStatus(req.params.id, 'published', req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'Promotion not found' });
    await audit(req, 'publish', row);
    return res.json({ success: true, message: 'Promotion published', data: toAdminPromotion(row) });
  } catch (error) {
    return handleError(res, error, 'publish');
  }
};

/** POST /api/admin/promotions/:id/unpublish */
export const unpublish = async (req, res) => {
  try {
    const row = await PromotionService.setStatus(req.params.id, 'draft', req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'Promotion not found' });
    await audit(req, 'unpublish', row);
    return res.json({ success: true, message: 'Promotion moved back to draft', data: toAdminPromotion(row) });
  } catch (error) {
    return handleError(res, error, 'unpublish');
  }
};

/** POST /api/admin/promotions/:id/duplicate — copy as a new draft. */
export const duplicate = async (req, res) => {
  try {
    const row = await PromotionService.duplicatePromotion(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ success: false, message: 'Promotion not found' });
    await audit(req, 'duplicate', row);
    return res.status(201).json({ success: true, message: 'Promotion duplicated as draft', data: toAdminPromotion(row) });
  } catch (error) {
    return handleError(res, error, 'duplicate');
  }
};

/** DELETE /api/admin/promotions/:id */
export const remove = async (req, res) => {
  try {
    const row = await Promotion.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Promotion not found' });
    const snapshot = { id: row.id, slug: row.slug, placement: row.placement, status: row.status };
    await row.destroy();
    await audit(req, 'delete', snapshot);
    return res.json({ success: true, message: 'Promotion deleted successfully' });
  } catch (error) {
    return handleError(res, error, 'delete');
  }
};

/**
 * POST /api/admin/promotions/:id/preview-link  body: { status?: 'draft'|'published' }
 * Returns a 10-minute signed link for the storefront preview route and the raw API URL.
 */
export const previewLink = async (req, res) => {
  try {
    if (!previewSecret()) {
      return res.status(500).json({ success: false, message: 'PREVIEW_SECRET or JWT_SECRET must be configured' });
    }
    const row = await Promotion.findByPk(req.params.id, { attributes: ['id', 'status'] });
    if (!row) return res.status(404).json({ success: false, message: 'Promotion not found' });

    const status = (req.body?.status || req.query.status) === 'published' ? 'published' : 'draft';
    const expires = Date.now() + PREVIEW_TTL_MS;
    const signature = signPromotionPreview(row.id, status, expires);
    const params = new URLSearchParams({ status, expires: String(expires), signature });

    const apiUrl = `${publicBaseUrl()}/api/promotions/preview/${row.id}?${params}`;
    const frontend = process.env.PREVIEW_FRONTEND_URL || (process.env.FRONTEND_URL || '').split(',')[0].trim();
    let url = null;
    if (frontend) {
      const u = new URL('/promotions/preview', frontend);
      u.searchParams.set('documentId', String(row.id));
      params.forEach((v, k) => u.searchParams.set(k, v));
      url = u.toString();
    }
    return res.json({ success: true, data: { url, apiUrl, expiresAt: new Date(expires).toISOString() } });
  } catch (error) {
    return handleError(res, error, 'preview');
  }
};

/** POST /api/admin/promotions/upload-image (multipart field "image") → { url, path } */
export const uploadImage = (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'image file is required' });
  const path = `uploads/${req.file.filename}`;
  return res.status(201).json({ success: true, data: { path, url: `${publicBaseUrl()}/${path}` } });
};
