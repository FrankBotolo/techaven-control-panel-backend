/**
 * Builds scripts/data/device-catalogue.json.gz from a local TechAPI checkout. Never touches a database.
 *   git clone --depth 1 https://github.com/GetTechAPI/TechAPI <dir>
 *   node scripts/build-device-catalogue.js --data-dir <dir>/data --revision <sha>
 * Data from TechAPI (https://github.com/GetTechAPI/TechAPI), CC BY-SA 4.0.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { normalizeNetwork, slugify } from '../services/catalogue/normalization.js';
import { brandLabel, cleanModelName, deviceSlug, isRegionalSku, modelKey } from '../services/catalogue/deviceIdentity.js';

const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const dataDir = option('--data-dir');
if (!dataDir) throw new Error('Usage: --data-dir <TechAPI/data> [--revision sha] [--out file]');
const out = option('--out') || new URL('./data/device-catalogue.json.gz', import.meta.url);
const CATEGORIES = { smartphone: 'Smartphones', tablet: 'Tablets', watch: 'Wearables', laptop: 'Laptops' };

const positive = (value) => (Number(value) > 0 ? Number(value) : null);
const text = (value, max) => {
  const string = String(value ?? '').trim();
  return !string || /^(0|unknown|none|n\/a|null)$/i.test(string) ? null : string.slice(0, max);
};
const network = (record) => {
  const raw = `${record.variant?.network?.cellular ?? ''} ${record.connectivity?.network ?? ''}`;
  const generations = [...raw.matchAll(/\b([2-6])G\b/gi)].map((match) => Number(match[1]));
  if (/\bLTE\b/i.test(raw)) generations.push(4);
  return generations.length ? normalizeNetwork(`${Math.max(...generations)}G`) : null;
};

// Sources file tablets, foldables and watches inconsistently; the marketed name decides.
const effectiveCategory = (category, name) => {
  if (category === 'Laptops' || category === 'Wearables') return category;
  if (/watch/i.test(name)) return 'Wearables';
  if (/\b(ipad|tab|tablet|matepad|mediapad|megapad|xpad|iconia|slate|pad)\b/i.test(name)) return 'Tablets';
  if (/\b(fold|flip)\d*\b/i.test(name)) return 'Smartphones';
  return category;
};
const groups = new Map();
const stats = { scanned: 0, malformed: 0, regional_skus_skipped: 0, incomplete: 0 };

for (const [type, category] of Object.entries(CATEGORIES)) {
  const root = path.join(dataDir, type);
  for (const file of readdirSync(root, { recursive: true })) {
    if (!file.endsWith('.json')) continue;
    stats.scanned++;
    let record;
    try { record = JSON.parse(readFileSync(path.join(root, file), 'utf8')); } catch { stats.malformed++; continue; }
    if (!record.name || !record.brand) { stats.incomplete++; continue; }
    if (isRegionalSku(record.name)) { stats.regional_skus_skipped++; continue; }
    let brand = slugify(record.brand);
    let name = cleanModelName(type === 'laptop' ? record.name.replace(/\s*\([^)]*\/[^)]*\)/g, '') : record.name, brand);
    if (brand === 'xiaomi' && /^poco\b/i.test(name)) { brand = 'poco'; name = cleanModelName(name, brand); }
    const key = modelKey(brand, name);
    if (!key) { stats.incomplete++; continue; }
    const effective = effectiveCategory(category, name);
    const id = `${effective}|${brand}|${key}`;
    if (!groups.has(id)) groups.set(id, { category: effective, brand, names: new Map(), records: [] });
    const group = groups.get(id);
    group.names.set(name, (group.names.get(name) || 0) + 1);
    group.records.push({ record, type });
  }
}

// The same model filed under two categories is one device. Foldables stay phones.
for (const [id, phone] of [...groups]) {
  if (phone.category !== 'Smartphones') continue;
  for (const category of ['Tablets', 'Wearables']) {
    const otherId = id.replace(/^Smartphones/, category);
    const other = groups.get(otherId);
    if (!other) continue;
    const keepPhone = /fold|flip|mate x|padfone|galaxy w$/i.test([...phone.names.keys()][0]);
    const [target, source, drop] = keepPhone ? [phone, other, otherId] : [other, phone, id];
    target.records.push(...source.records);
    for (const [label, count] of source.names) target.names.set(label, (target.names.get(label) || 0) + count);
    groups.delete(drop);
  }
}

const devices = [];
const usedSlugs = new Set();
for (const group of groups.values()) {
  const best = [...group.records].sort((a, b) => Number(b.record.verified === true) - Number(a.record.verified === true)
    || Object.keys(b.record).length - Object.keys(a.record).length);
  const first = (pick) => {
    for (const { record } of best) { const value = pick(record); if (value != null) return value; }
    return null;
  };
  const name = [...group.names].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0][0].slice(0, 200);
  const variants = new Map();
  for (const { record, type } of best) {
    // TechAPI requires ram_gb and fills 1 when it is unknown.
    let ram = positive(record.variant?.memory?.ram_gb ?? record.ram_gb);
    const explicit = positive(record.variant?.memory?.storage_gb ?? record.storage_gb);
    let storages = explicit ? [explicit] : (record.storage_options_gb || []).map(positive).filter(Boolean);
    storages = storages.map(Math.round).filter((gb) => gb >= 1 && gb <= 16384 && (!ram || gb > ram || type === 'watch'));
    if (ram === 1 && !storages.length) ram = null;
    const extra = type === 'laptop' ? Object.fromEntries(Object.entries({
      cpu: text(record.cpu_name, 120), gpu: text(record.gpu_name, 120),
      display_inch: record.display?.size_inch ?? null, resolution: record.display?.resolution ?? null
    }).filter(([, value]) => value != null)) : {};
    const fingerprint = Object.keys(extra).length
      ? createHash('sha256').update(JSON.stringify(extra)).digest('hex').slice(0, 12) : '';
    for (const storage of storages.length ? storages : [null]) {
      if (ram == null && storage == null && !fingerprint) continue;
      const key = [ram, storage, fingerprint].join('|');
      // Combinations multiplied out from a list are never treated as verified.
      const verified = record.verified === true && storages.length <= 1;
      const existing = variants.get(key);
      if (existing) existing.verified ||= verified;
      else variants.set(key, { ram, storage, verified, ...(fingerprint && { extra, fingerprint }) });
    }
  }
  let list = [...variants.values()];
  // Each iPhone model ships with exactly one RAM size; other values are source errors.
  if (group.brand === 'apple' && /^iphone/i.test(name)) {
    const ram = Math.max(...list.map((v) => v.ram ?? 0));
    list = list.filter((v) => v.ram === ram);
  }
  // Drop incomplete rows when a fuller row describes the same configuration.
  list = list.filter((v) => v.fingerprint || !(
    (v.storage == null && list.some((o) => o.storage != null))
    || (v.ram == null && list.some((o) => o.ram != null && o.storage === v.storage))));
  if (!list.length) list = [{ ram: null, storage: null, verified: false }];
  list.sort((a, b) => (a.ram ?? 0) - (b.ram ?? 0) || (a.storage ?? 0) - (b.storage ?? 0));

  let slug = deviceSlug(group.brand, name).slice(0, 200);
  if (usedSlugs.has(slug)) slug = `${slug}-${slugify(group.category)}`;
  if (usedSlugs.has(slug)) throw new Error(`Duplicate slug ${slug}`);
  usedSlugs.add(slug);
  const specs = {
    display: first((r) => r.display), cameras: first((r) => r.cameras), dimensions: first((r) => r.dimensions),
    ip_rating: first((r) => text(r.ip_rating, 40)), weight_g: first((r) => positive(r.weight_g)),
    charging: { wired_w: first((r) => positive(r.charging_wired_w)), wireless_w: first((r) => positive(r.charging_wireless_w)) },
    connectivity: first((r) => r.connectivity)
  };
  devices.push({
    slug, name, brand: group.brand, category: group.category,
    release_date: first((r) => (/^\d{4}-\d{2}-\d{2}$/.test(r.release_date) ? r.release_date : null)),
    soc: group.category === 'Laptops' ? null : first((r) => text(r.soc, 180)),
    battery_mah: first((r) => (positive(r.battery_mah) ? Math.round(r.battery_mah) : null)),
    os: first((r) => text(String(r.os ?? '').split(/[\s,]+v?\d/)[0], 80)),
    // A marketed model has one network generation; a 4G/5G mix inside it is source noise.
    network: best.map(({ record }) => network(record)).filter(Boolean).sort().pop() || null,
    verified: best[0].record.verified === true,
    sim: first((r) => text(r.variant?.sim || r.connectivity?.sim, 160)),
    model_numbers: first((r) => (r.model_numbers?.length ? r.model_numbers.slice(0, 12) : null)),
    image: first((r) => (r.image_url ? { url: r.image_url, license: r.image_license, author: r.image_attribution } : null)),
    sources: [...new Set(best.flatMap(({ record }) => record.source_urls || []))].slice(0, 3),
    specs: Object.fromEntries(Object.entries(specs).filter(([, value]) => value != null)),
    variants: list
  });
}
devices.sort((a, b) => (a.slug < b.slug ? -1 : 1));
const brands = [...new Set(devices.map((device) => device.brand))].sort().map((slug) => ({ slug, name: brandLabel(slug) }));
const manifest = {
  attribution: 'Data from TechAPI (https://github.com/GetTechAPI/TechAPI), CC BY-SA 4.0',
  revision: option('--revision'), brands, devices
};
writeFileSync(out, gzipSync(JSON.stringify(manifest), { level: 9 }));
const byCategory = {};
for (const device of devices) byCategory[device.category] = (byCategory[device.category] || 0) + 1;
console.log(JSON.stringify({
  ...stats, brands: brands.length, devices: devices.length,
  variants: devices.reduce((sum, device) => sum + device.variants.length, 0), byCategory
}, null, 2));
