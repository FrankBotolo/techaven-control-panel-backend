import { Op } from 'sequelize';

/** Matches DB `subscription_packages.slug` (utf8mb4-safe unique key length). */
export const SUBSCRIPTION_PACKAGE_SLUG_MAX_LENGTH = 191;

export function normalizeSubscriptionPackageSlug(slug) {
  let s = String(slug)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  if (s.length > SUBSCRIPTION_PACKAGE_SLUG_MAX_LENGTH) {
    s = s.slice(0, SUBSCRIPTION_PACKAGE_SLUG_MAX_LENGTH).replace(/-+$/g, '');
  }
  return s;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + Number(days));
  return d;
}

/** First period end: billing duration + optional trial bonus at start */
export function computePeriodEnd(startDate, packageRow) {
  const totalDays =
    Number(packageRow.duration_days || 30) + Number(packageRow.trial_days || 0);
  return addDays(startDate, totalDays);
}

export function isSubscriptionDateExpired(currentPeriodEnd) {
  if (!currentPeriodEnd) return false;
  return new Date() > new Date(currentPeriodEnd);
}

export const ACTIVE_LIKE = ['pending_payment', 'trialing', 'active', 'past_due'];

export function whereActiveSubscriptions(shopId) {
  return {
    shop_id: shopId,
    status: { [Op.in]: ACTIVE_LIKE }
  };
}
