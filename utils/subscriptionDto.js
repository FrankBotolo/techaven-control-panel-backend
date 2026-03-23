import { isSubscriptionDateExpired } from './subscriptionHelpers.js';

export function toPackageDto(p, { admin = false } = {}) {
  if (!p) return null;
  const row = p.get ? p.get({ plain: true }) : p;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description || null,
    price_mwk: parseFloat(row.price_mwk),
    currency: row.currency || 'MWK',
    billing_period: row.billing_period,
    duration_days: row.duration_days,
    trial_days: row.trial_days || 0,
    features: row.features || [],
    limits: row.limits || {},
    is_active: !!row.is_active,
    is_featured: !!row.is_featured,
    sort_order: row.sort_order,
    ...(admin && {
      created_at: row.createdAt || row.created_at,
      updated_at: row.updatedAt || row.updated_at
    })
  };
}

export function toShopSubscriptionDto(sub, pkg = null) {
  if (!sub) return null;
  const row = sub.get ? sub.get({ plain: true }) : sub;
  const pack = pkg || row.package || row.SubscriptionPackage;
  const periodEnd = row.current_period_end;
  const expiredByDate = isSubscriptionDateExpired(periodEnd);
  let effective_status = row.status;
  if (
    expiredByDate &&
    ['active', 'trialing', 'past_due', 'pending_payment'].includes(row.status)
  ) {
    effective_status = 'expired';
  }

  return {
    id: row.id,
    shop_id: row.shop_id,
    package_id: row.package_id,
    package: pack ? toPackageDto(pack, { admin: false }) : null,
    status: row.status,
    effective_status,
    payment_status: row.payment_status,
    trial_ends_at: row.trial_ends_at || null,
    current_period_start: row.current_period_start || null,
    current_period_end: row.current_period_end || null,
    cancel_at_period_end: !!row.cancel_at_period_end,
    canceled_at: row.canceled_at || null,
    auto_renew: !!row.auto_renew,
    payment_reference: row.payment_reference || null,
    notes: row.notes || null,
    created_at: row.createdAt || row.created_at,
    updated_at: row.updatedAt || row.updated_at
  };
}
