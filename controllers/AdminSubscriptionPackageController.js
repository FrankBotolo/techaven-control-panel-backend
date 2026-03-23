import db from '../models/index.js';
import { logAudit, auditContext } from '../utils/audit.js';
import { toPackageDto } from '../utils/subscriptionDto.js';
import { normalizeSubscriptionPackageSlug } from '../utils/subscriptionHelpers.js';

const { SubscriptionPackage, ShopSubscription } = db;

export const list = async (req, res) => {
  try {
    const { include_inactive } = req.query;
    const where = {};
    if (include_inactive !== 'true' && include_inactive !== '1') {
      where.is_active = true;
    }

    const rows = await SubscriptionPackage.findAll({
      where,
      order: [
        ['sort_order', 'ASC'],
        ['id', 'ASC']
      ]
    });

    return res.json({
      success: true,
      message: 'Subscription packages retrieved',
      data: { packages: (rows || []).map((p) => toPackageDto(p, { admin: true })) }
    });
  } catch (error) {
    console.error('Admin list subscription packages error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch packages',
      error: error.message
    });
  }
};

export const getOne = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await SubscriptionPackage.findByPk(id);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }
    return res.json({
      success: true,
      data: { package: toPackageDto(row, { admin: true }) }
    });
  } catch (error) {
    console.error('Admin get subscription package error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch package',
      error: error.message
    });
  }
};

export const create = async (req, res) => {
  try {
    const {
      slug,
      name,
      description,
      price_mwk,
      currency,
      billing_period,
      duration_days,
      trial_days,
      features,
      limits,
      is_active,
      is_featured,
      sort_order
    } = req.body;

    if (!slug || !name || price_mwk == null) {
      return res.status(400).json({
        success: false,
        message: 'slug, name, and price_mwk are required'
      });
    }

    const normalizedSlug = normalizeSubscriptionPackageSlug(slug);
    if (!normalizedSlug) {
      return res.status(400).json({
        success: false,
        message: 'slug must contain at least one letter or digit after normalization'
      });
    }

    const existing = await SubscriptionPackage.findOne({ where: { slug: normalizedSlug } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A package with this slug already exists' });
    }

    const row = await SubscriptionPackage.create({
      slug: normalizedSlug,
      name: String(name).trim(),
      description: description || null,
      price_mwk: parseFloat(price_mwk),
      currency: currency || 'MWK',
      billing_period: billing_period || 'monthly',
      duration_days: duration_days != null ? parseInt(duration_days, 10) : 30,
      trial_days: trial_days != null ? parseInt(trial_days, 10) : 0,
      features: Array.isArray(features) ? features : features ? JSON.parse(JSON.stringify(features)) : [],
      limits: limits && typeof limits === 'object' ? limits : {},
      is_active: is_active !== false && is_active !== 'false',
      is_featured: is_featured === true || is_featured === 'true',
      sort_order: sort_order != null ? parseInt(sort_order, 10) : 0
    });

    await logAudit({
      ...auditContext(req),
      action: 'admin.subscription_package.create',
      actor_user_id: req.user.id,
      target_type: 'subscription_package',
      target_id: row.id,
      metadata: { slug: row.slug, name: row.name }
    });

    return res.status(201).json({
      success: true,
      message: 'Subscription package created',
      data: { package: toPackageDto(row, { admin: true }) }
    });
  } catch (error) {
    console.error('Admin create subscription package error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create package',
      error: error.message
    });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await SubscriptionPackage.findByPk(id);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }

    const {
      name,
      description,
      price_mwk,
      currency,
      billing_period,
      duration_days,
      trial_days,
      features,
      limits,
      is_active,
      is_featured,
      sort_order
    } = req.body;

    if (name != null) row.name = String(name).trim();
    if (description !== undefined) row.description = description;
    if (price_mwk != null) row.price_mwk = parseFloat(price_mwk);
    if (currency != null) row.currency = currency;
    if (billing_period != null) row.billing_period = billing_period;
    if (duration_days != null) row.duration_days = parseInt(duration_days, 10);
    if (trial_days != null) row.trial_days = parseInt(trial_days, 10);
    if (features !== undefined) {
      row.features = Array.isArray(features) ? features : [];
    }
    if (limits !== undefined) row.limits = limits && typeof limits === 'object' ? limits : {};
    if (is_active !== undefined) row.is_active = is_active === true || is_active === 'true';
    if (is_featured !== undefined) row.is_featured = is_featured === true || is_featured === 'true';
    if (sort_order != null) row.sort_order = parseInt(sort_order, 10);

    await row.save();

    await logAudit({
      ...auditContext(req),
      action: 'admin.subscription_package.update',
      actor_user_id: req.user.id,
      target_type: 'subscription_package',
      target_id: row.id,
      metadata: { slug: row.slug }
    });

    return res.json({
      success: true,
      message: 'Subscription package updated',
      data: { package: toPackageDto(row, { admin: true }) }
    });
  } catch (error) {
    console.error('Admin update subscription package error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update package',
      error: error.message
    });
  }
};

/** Soft-disable (preferred) or hard-delete if no subscriptions reference it */
export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await SubscriptionPackage.findByPk(id);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }

    const inUse = await ShopSubscription.count({ where: { package_id: id } });
    if (inUse > 0) {
      row.is_active = false;
      await row.save();
      await logAudit({
        ...auditContext(req),
        action: 'admin.subscription_package.deactivate',
        actor_user_id: req.user.id,
        target_type: 'subscription_package',
        target_id: row.id,
        metadata: { reason: 'has_subscriptions' }
      });
      return res.json({
        success: true,
        message: 'Package deactivated (existing subscriptions still reference it)',
        data: { package: toPackageDto(row, { admin: true }) }
      });
    }

    await row.destroy();
    await logAudit({
      ...auditContext(req),
      action: 'admin.subscription_package.delete',
      actor_user_id: req.user.id,
      target_type: 'subscription_package',
      target_id: parseInt(id, 10),
      metadata: {}
    });

    return res.json({ success: true, message: 'Subscription package deleted' });
  } catch (error) {
    console.error('Admin delete subscription package error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete package',
      error: error.message
    });
  }
};
