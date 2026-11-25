import { slugify } from './normalization.js';

const brandLabels = {
  htc: 'HTC', lg: 'LG', zte: 'ZTE', tcl: 'TCL', hp: 'HP', hmd: 'HMD', iqoo: 'iQOO', oneplus: 'OnePlus', oppo: 'OPPO', vivo: 'vivo', itel: 'itel',
  realme: 'realme', blu: 'BLU', bq: 'BQ', nec: 'NEC', 'sony-ericsson': 'Sony Ericsson', 't-mobile': 'T-Mobile', 'at-t': 'AT&T',
  poco: 'POCO', umidigi: 'UMIDIGI', blackberry: 'BlackBerry', asus: 'Asus', msi: 'MSI', xolo: 'XOLO', redmagic: 'RedMagic'
};
export const brandLabel = (slug) => brandLabels[slug]
  || slug.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

/** PhoneDB-style regional SKU names ("SM-S921B/DS Galaxy S24 5G Global Dual SIM TD-LTE 256GB") duplicate the marketed model. */
export const isRegionalSku = (name) =>
  /\b(TD-?LTE|LTE-A|UMTS|HSPA\+?|HSDPA|CDMA|WCDMA|TD-SCDMA|EV-?DO|GPRS|AxGP|WiMAX|UW|LTE CA)\b/i.test(name)
  || /\((?:Apple i|[A-Z][a-z]+ [A-Z]\d)/.test(name) || /\bSM-[A-Z]\d{3}/i.test(name);

/** Brandless marketed name with memory/SIM noise removed. */
export function cleanModelName(name, brandSlug) {
  let value = String(name ?? '')
    .replace(/\s*\([^)]*(?:\d\s*[GT]B|RAM|ROM|dual[- ]?sim)[^)]*\)/gi, '')
    .replace(/\b\d+(?:\.\d+)?\s*GB\b(?:\s*(?:RAM|ROM)\b)?(?:\s*[+/,]\s*)?/gi, '')
    .replace(/\b(?:dual|single)[- ]sim\b/gi, '')
    .replace(/\s+/g, ' ').trim();
  const words = brandSlug.split('-').map((part) => part.replace(/[^a-z0-9]/g, '')).join('[\\s&-]*');
  for (let i = 0; i < 2; i++) value = value.replace(new RegExp(`^${words}[\\s-]+(?=\\S)`, 'i'), '');
  return value.replace(/^[\s,;/+-]+|[\s,;/-]+$/g, '');
}

/** Comparison key: "Galaxy S24+" and "Samsung Galaxy S24 Plus" collapse to the same value. */
export function modelKey(brandSlug, name) {
  return slugify(cleanModelName(name, brandSlug).replace(/\+/g, ' plus ')).replace(/-/g, '');
}

/** Same scheme as device-variants.js: iphone-17, samsung-galaxy-s25, google-pixel-10. */
export function deviceSlug(brandSlug, name) {
  const base = slugify(cleanModelName(name, brandSlug).replace(/\+/g, ' plus '));
  return brandSlug === 'apple' && /^(iphone|ipad|macbook)/.test(base) ? base : `${brandSlug}-${base}`;
}

import db from '../../models/index.js';

export async function resolveDeviceIdentity(identifier, transaction) {
  const where = /^\d+$/.test(String(identifier)) ? { id: Number(identifier) } : { slug: identifier };
  const options = { transaction, ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}) };
  let device = await db.Device.findOne({ where, ...options });
  const visited = new Set();
  while (device?.canonical_device_id) {
    if (visited.has(device.id)) throw new Error('Circular catalog alias');
    visited.add(device.id);
    device = await db.Device.findByPk(device.canonical_device_id, options);
  }
  return device;
}
