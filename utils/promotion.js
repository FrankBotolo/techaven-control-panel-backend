/**
 * Promotions / merchandising helpers.
 * Ported from the Techaven Promotions CMS (Strapi) so the storefront receives the same
 * normalized promotion shape, but product/shop references point at this server's own
 * v2 catalogue devices and shops (no external mirror tables or catalog sync needed).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';


export const PLACEMENTS = [
  'home_hero',
  'categories_hero',
  'category_hero',
  'products_hero',
  'shops_hero',
  'shop_hero',
  'catalogs_hero',
  'deals_hero',
  'compare_hero',
  'trade_in_hero',
  'help_hero',
  'search_hero',
  'home_banner_1',
  'home_product_rail_1',
  'home_banner_2',
  'home_shop_rail',
  'home_inline_1',
  'category_inline_1',
  'category_inline_2',
  'search_inline_1',
  'deals_inline_1',
  'shops_inline_1',
  'shop_inline_1',
  'product_inline_1',
  'catalog_inline_1',
  'promotion_page_hero',
  'promotion_page_inline_1',
  'promotion_page_inline_2',
  'promotion_page_inline_3',
  'header_mega_menu',
  'site_announcement'
];

export const LAYOUTS = [
  'hero',
  'hero_product',
  'split',
  'banner',
  'lifestyle_banner',
  'product_rail',
  'product_grid',
  'shop_rail',
  'service_grid',
  'card_rail',
  'flash_deals',
  'coupon',
  'editorial',
  'announcement'
];

export const PRESENTATIONS = [
  'standard',
  'product_led',
  'lifestyle',
  'dark_editorial',
  'image_top',
  'image_side',
  'image_right',
  'background_image',
  'compact'
];

export const IMAGE_POSITIONS = ['left', 'right', 'top', 'background'];

export const THEMES = ['light', 'dark', 'brand', 'brand_soft', 'neutral'];

export const TARGET_TYPES = [
  'product',
  'shop',
  'category',
  'catalog',
  'search',
  'compare',
  'trade_in',
  'deals',
  'promotion_page',
  'internal_path',
  'external_url',
  'none'
];

export const STATUSES = ['draft', 'published'];

/** Editable scalar fields (camelCase, as accepted by the admin API). */
export const PROMOTION_FIELDS = [
  'internalName',
  'slug',
  'headline',
  'subheadline',
  'body',
  'placement',
  'layout',
  'presentation',
  'slotGroup',
  'groupOrder',
  'imagePosition',
  'theme',
  'desktopBackgroundUrl',
  'desktopBackgroundAlt',
  'mobileBackgroundUrl',
  'mobileBackgroundAlt',
  'foregroundImageUrl',
  'foregroundImageAlt',
  'seoImageUrl',
  'seoImageAlt',
  'altTextOverride',
  'eyebrow',
  'badge',
  'finePrint',
  'campaignIntro',
  'showCountdown',
  'couponCode',
  'instructionOne',
  'instructionTwo',
  'instructionThree',
  'ctaLabel',
  'targetType',
  'targetValue',
  'externalUrl',
  'secondaryCtaLabel',
  'secondaryTargetType',
  'secondaryTargetValue',
  'secondaryExternalUrl',
  'targetCategorySlug',
  'targetShopId',
  'targetBrandSlug',
  'targetCampaignSlug',
  'seoTitle',
  'seoDescription',
  'startsAt',
  'endsAt',
  'priority',
  'commerceOfferKey',
  'anchorDeviceId',
  'notes'
];

/** Media fields accept either a URL string or { url, alt } in the admin API. */
export const MEDIA_FIELDS = ['desktopBackground', 'mobileBackground', 'foregroundImage', 'seoImage'];

export function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

const str = (v) => (typeof v === 'string' ? v.trim() : '');

/**
 * Validate a merged promotion record. Relation counts are passed in separately because
 * they are resolved against the database (only active devices / active shops count).
 *
 * @param {object} data camelCase promotion fields
 * @param {{ devices?: number, shops?: number, anchorDevice?: number }} counts
 * @returns {{ path: string, message: string }[]}
 */
export function validatePromotion(data, counts = {}) {
  const errors = [];
  const productCount = counts.devices ?? 0;
  const shopCount = counts.shops ?? 0;
  const anchorCount = counts.anchorDevice ?? 0;

  if (!str(data.internalName)) errors.push({ path: 'internalName', message: 'Internal name is required' });
  if (!str(data.headline)) errors.push({ path: 'headline', message: 'Headline is required' });
  if (!data.placement) errors.push({ path: 'placement', message: 'Placement is required' });
  if (!data.layout) errors.push({ path: 'layout', message: 'Layout is required' });
  if (!data.theme) errors.push({ path: 'theme', message: 'Theme is required' });

  const startsAt = data.startsAt ? Date.parse(data.startsAt) : NaN;
  const endsAt = data.endsAt ? Date.parse(data.endsAt) : NaN;
  if (data.startsAt && Number.isNaN(startsAt)) errors.push({ path: 'startsAt', message: 'Invalid start date' });
  if (data.endsAt && Number.isNaN(endsAt)) errors.push({ path: 'endsAt', message: 'Invalid end date' });
  if (!Number.isNaN(startsAt) && !Number.isNaN(endsAt) && endsAt <= startsAt) {
    errors.push({ path: 'endsAt', message: 'End date must be later than start date' });
  }

  const enumChecks = [
    ['placement', PLACEMENTS, 'Unknown promotion placement'],
    ['layout', LAYOUTS, 'Unknown promotion layout'],
    ['presentation', PRESENTATIONS, 'Unknown promotion presentation'],
    ['imagePosition', IMAGE_POSITIONS, 'Unknown image position'],
    ['theme', THEMES, 'Unknown promotion theme'],
    ['targetType', TARGET_TYPES, 'Unknown CTA target type'],
    ['secondaryTargetType', TARGET_TYPES, 'Unknown secondary CTA target type']
  ];
  for (const [path, allowed, message] of enumChecks) {
    if (data[path] != null && data[path] !== '' && !allowed.includes(data[path])) {
      errors.push({ path, message });
    }
  }

  const ctaChecks = [
    ['ctaLabel', 'targetType', 'targetValue', 'externalUrl', ''],
    ['secondaryCtaLabel', 'secondaryTargetType', 'secondaryTargetValue', 'secondaryExternalUrl', 'Secondary ']
  ];
  for (const [labelKey, typeKey, valueKey, urlKey, prefix] of ctaChecks) {
    const label = str(data[labelKey]);
    const type = data[typeKey] || 'none';
    if (label && type === 'none') {
      errors.push({ path: typeKey, message: `${prefix}CTA label requires a destination` });
    }
    if (type === 'external_url' && !isHttpsUrl(str(data[urlKey]))) {
      errors.push({
        path: urlKey,
        message: prefix ? 'Secondary external CTA requires a valid HTTPS URL' : 'External CTA requires a valid HTTPS URL'
      });
    }
    if (type !== 'none' && type !== 'external_url' && !str(data[valueKey])) {
      errors.push({ path: valueKey, message: `${prefix}CTA destination value is required` });
    }
  }

  if (data.layout === 'product_rail' && productCount < 2) {
    errors.push({ path: 'deviceIds', message: 'Product rail requires at least two active devices' });
  }
  if (data.layout === 'product_grid' && productCount < 2) {
    errors.push({ path: 'deviceIds', message: 'Product grid requires at least two active devices' });
  }
  if (data.layout === 'shop_rail' && shopCount < 2) {
    errors.push({ path: 'shopIds', message: 'Shop rail requires at least two active shops' });
  }
  if (data.layout === 'hero_product' && anchorCount < 1) {
    errors.push({ path: 'anchorDeviceId', message: 'Product hero requires an active anchor device' });
  }
  if (['split', 'service_grid', 'card_rail'].includes(data.layout) && !str(data.slotGroup)) {
    errors.push({ path: 'slotGroup', message: 'Grouped promotion layout requires a slot group' });
  }
  if (data.layout === 'flash_deals') {
    if (productCount < 2) errors.push({ path: 'deviceIds', message: 'Flash deals require at least two active devices' });
    if (!data.startsAt) errors.push({ path: 'startsAt', message: 'Flash deals require a start date' });
    if (!data.endsAt) errors.push({ path: 'endsAt', message: 'Flash deals require an end date' });
  }
  if (data.layout === 'coupon') {
    const instructions = [data.instructionOne, data.instructionTwo, data.instructionThree].filter((v) => str(v)).length;
    if (!str(data.couponCode) && instructions < 2) {
      errors.push({ path: 'couponCode', message: 'Coupon layout requires a code or at least two instructions' });
    }
  }
  if (data.presentation === 'background_image' && !str(data.desktopBackgroundUrl)) {
    errors.push({ path: 'desktopBackground', message: 'Background-image presentation requires desktop artwork' });
  }

  return errors;
}

export function isActiveAt(promotion, now = new Date()) {
  const ts = now.getTime();
  const starts = promotion.startsAt ? new Date(promotion.startsAt).getTime() : null;
  const ends = promotion.endsAt ? new Date(promotion.endsAt).getTime() : null;
  return (starts == null || starts <= ts) && (ends == null || ends >= ts);
}

export function publicBaseUrl() {
  return (process.env.PUBLIC_API_BASE_URL || process.env.APP_URL || `http://localhost:${process.env.PORT || 8000}`).replace(/\/$/, '');
}

export function absoluteMediaUrl(url, base = publicBaseUrl()) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${base}/${String(url).replace(/^\//, '')}`;
}

function normalizeMedia(url, alt, p) {
  if (!url) return null;
  return {
    url: absoluteMediaUrl(url),
    alt: p.altTextOverride || alt || p.headline
  };
}

function cta(label, type, value, externalUrl) {
  const targetType = type || 'none';
  const targetValue = targetType === 'external_url' ? externalUrl : value;
  return label && targetType !== 'none' && targetValue ? { label, targetType, targetValue } : null;
}

/**
 * Storefront refs use the same identities the CMS catalogue sync used
 * (services/catalogue/promotionSync.js): devices are `device:<id>` + device slug,
 * shops are `<id>` + `shop-<id>`. The storefront resolves them via
 * /api/v2/marketplace/devices?ids= and /api/shops?ids=.
 */
export const deviceRef = (d) => ({ externalId: `device:${d.id}`, slug: d.slug });
export const shopRef = (s) => ({ externalId: String(s.id), slug: `shop-${s.id}` });

function deviceSummary(device) {
  const d = device?.get ? device.get({ plain: true }) : device;
  return { id: d.id, slug: d.slug, name: d.name, image: absoluteMediaUrl(d.primary_image_url) };
}

function shopSummary(shop) {
  const s = shop?.get ? shop.get({ plain: true }) : shop;
  return {
    id: s.id,
    name: s.name,
    logo: absoluteMediaUrl(s.logo),
    location: s.location || null,
    is_verified: !!s.is_verified
  };
}

/**
 * Storefront shape, matching the CMS `normalizePromotion` output (the frontend validates it
 * with zod: `id` is a string, refs are { externalId, slug } strings). Lightweight device/shop
 * summaries are added alongside; the frontend ignores them.
 */
export function normalizePromotion(entity) {
  const p = entity?.get ? entity.get({ plain: true }) : entity;

  const links = (p.deviceLinks || []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const live = (l) => l.device && l.device.is_active !== false;
  const primary = links.filter((l) => l.role === 'primary' && live(l)).map((l) => l.device);
  const secondary = links.filter((l) => l.role === 'secondary' && live(l)).map((l) => l.device);
  const anchor = p.anchorDevice && p.anchorDevice.is_active !== false ? p.anchorDevice : null;
  const shops = (p.shopLinks || [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((l) => l.shop && l.shop.status !== 'inactive')
    .map((l) => l.shop);

  return {
    id: String(p.id),
    slug: p.slug,
    status: p.status,
    eyebrow: p.eyebrow ?? null,
    headline: p.headline,
    subheadline: p.subheadline ?? null,
    body: p.body ?? null,
    campaignIntro: p.campaignIntro ?? null,
    badge: p.badge ?? null,
    finePrint: p.finePrint ?? null,
    placement: p.placement,
    layout: p.layout,
    presentation: p.presentation || 'standard',
    slotGroup: p.slotGroup ?? null,
    groupOrder: p.groupOrder ?? 0,
    imagePosition: p.imagePosition || 'right',
    theme: p.theme,
    desktopBackground: normalizeMedia(p.desktopBackgroundUrl, p.desktopBackgroundAlt, p),
    mobileBackground: normalizeMedia(p.mobileBackgroundUrl, p.mobileBackgroundAlt, p),
    foregroundImage: normalizeMedia(p.foregroundImageUrl, p.foregroundImageAlt, p),
    cta: cta(p.ctaLabel, p.targetType, p.targetValue, p.externalUrl),
    secondaryCta: cta(p.secondaryCtaLabel, p.secondaryTargetType, p.secondaryTargetValue, p.secondaryExternalUrl),
    commerceOfferKey: p.commerceOfferKey ?? null,
    schedule: { startsAt: p.startsAt ?? null, endsAt: p.endsAt ?? null },
    showCountdown: !!p.showCountdown,
    coupon: {
      code: p.couponCode ?? null,
      instructions: [p.instructionOne, p.instructionTwo, p.instructionThree].filter(Boolean)
    },
    targeting: {
      categorySlug: p.targetCategorySlug ?? null,
      shopId: p.targetShopId ?? null,
      shopExternalId: p.targetShopId ?? null,
      brandSlug: p.targetBrandSlug ?? null,
      campaignSlug: p.targetCampaignSlug ?? null
    },
    seo: {
      title: p.seoTitle ?? null,
      description: p.seoDescription ?? null,
      image: normalizeMedia(p.seoImageUrl, p.seoImageAlt, p)
    },
    productRefs: primary.map(deviceRef),
    anchorProductRef: anchor ? deviceRef(anchor) : null,
    secondaryProductRefs: secondary.map(deviceRef),
    shopRefs: shops.map(shopRef),
    devices: primary.map(deviceSummary),
    anchorDevice: anchor ? deviceSummary(anchor) : null,
    secondaryDevices: secondary.map(deviceSummary),
    shops: shops.map(shopSummary)
  };
}

/** Admin shape: every editable field plus relation ids and timestamps. */
export function toAdminPromotion(entity) {
  const p = entity?.get ? entity.get({ plain: true }) : entity;
  const out = { id: p.id, status: p.status, publishedAt: p.publishedAt ?? null };
  for (const f of PROMOTION_FIELDS) out[f] = p[f] ?? null;
  const links = (p.deviceLinks || []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
  out.deviceIds = links.filter((l) => l.role === 'primary').map((l) => l.deviceId);
  out.secondaryDeviceIds = links.filter((l) => l.role === 'secondary').map((l) => l.deviceId);
  out.shopIds = (p.shopLinks || []).slice().sort((a, b) => a.sortOrder - b.sortOrder).map((l) => l.shopId);
  out.isLive = p.status === 'published' && isActiveAt(p);
  out.createdAt = p.createdAt;
  out.updatedAt = p.updatedAt;
  return out;
}

// ─── Signed draft previews ──────────────────────────────────────────────────

export const PREVIEW_TTL_MS = 10 * 60 * 1000;

export function previewSecret() {
  return process.env.PREVIEW_SECRET || process.env.JWT_SECRET || '';
}

function previewPayload(id, status, expires) {
  return JSON.stringify({ id: String(id), status, expires });
}

export function signPromotionPreview(id, status, expires, secret = previewSecret()) {
  return createHmac('sha256', secret).update(previewPayload(id, status, expires)).digest('hex');
}

export function verifyPromotionPreview(id, status, expires, signature, secret = previewSecret(), now = Date.now()) {
  if (!id || !secret || !Number.isSafeInteger(expires) || expires <= now) return false;
  if (!/^[a-f0-9]{64}$/i.test(signature || '')) return false;
  const expected = Buffer.from(signPromotionPreview(id, status, expires, secret), 'hex');
  const supplied = Buffer.from(signature, 'hex');
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
