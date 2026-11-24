/**
 * Finds a photo for each catalogue device and writes scripts/data/device-images.json. Never touches a database.
 *
 * Sources, in order of preference:
 *   1. the repository's reviewed manufacturer manifests (apple.com, samsung.com, mi.com, ...)
 *   2. Wikidata P18 photos and English Wikipedia lead photos on Wikimedia Commons
 *      (free licences only; licence, author and file page are kept for attribution)
 *
 *   node scripts/resolve-device-images.js
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { brandLabel, modelKey } from '../services/catalogue/deviceIdentity.js';
import { slugify } from '../services/catalogue/normalization.js';

const data = (file) => new URL(`./data/${file}`, import.meta.url);
const { devices } = JSON.parse(gunzipSync(readFileSync(data('device-catalogue.json.gz'))));
const USER_AGENT = 'device-catalogue-seeder/1.0';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(url, options = {}) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(url, { ...options, headers: { 'user-agent': USER_AGENT, accept: 'application/json', ...options.headers }, signal: AbortSignal.timeout(90000) });
      if (response.ok) return await response.json();
      if (response.status !== 429 && response.status < 500) throw Object.assign(new Error(`HTTP ${response.status}`), { fatal: true });
      await sleep(Math.max(Number(response.headers.get('retry-after')) * 1000 || 0, 3000 * (attempt + 1)));
    } catch (error) {
      if (error.fatal || attempt === 4) throw error;
      await sleep(3000 * (attempt + 1));
    }
  }
  throw new Error(`Gave up on ${new URL(url).host}`);
}
const post = (api, params) => getJson(api, { method: 'POST', body: new URLSearchParams({ format: 'json', formatversion: '2', ...params }) });

const byKey = new Map(); // brand|key -> devices (a phone and a tablet can share a name)
const byFullName = new Map();
for (const device of devices) {
  const key = modelKey(device.brand, device.name);
  for (const [map, id] of [[byKey, `${device.brand}|${key}`], [byFullName, slugify(`${device.brand} ${device.name.replace(/\+/g, ' plus ')}`).replace(/-/g, '')]]) {
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(device);
  }
}
/** Accepts "Samsung Galaxy S24" or brand-less but unmistakable names such as "iPhone 12" and "Redmi 10". */
function matchLabel(label) {
  const key = slugify(label.replace(/\+/g, ' plus ')).replace(/-/g, '');
  const exact = byFullName.get(key);
  if (exact) return exact;
  if (/^(iphone|ipad|macbook)/.test(key)) return byKey.get(`apple|${key}`) ?? [];
  if (/^(redmi|mi\d)/.test(key)) return byKey.get(`xiaomi|${key}`) ?? [];
  return [];
}
// Photos of a shop, a prototype or the inside of a phone are not product photos.
const badFile = /prototype|open(ed)?\b|teardown|disassembl|battery|logo|street|road|store|shop|mongkok|\bHK\b|camera sample|taken (with|by)|screenshot|box\b|motherboard|charger|\bcase\b|advert|event|keynote|booth|back\b|rear|r(ü|u)ck|diagram|comparison|\.(svg|gif|tiff?|webm|ogv|pdf)$/i;
/** The file name must name this model, so a series photo is not attached to every sibling. */
function fileNamesModel(file, device) {
  const squash = (value) => slugify(value.replace(/\+/g, ' plus ')).replace(/-/g, '');
  const target = squash(file);
  const model = squash(device.name);
  const index = target.indexOf(model);
  if (index < 0 || (model.length < 3 && !target.includes(squash(`${device.brand}${device.name}`)))) return false;
  // "Galaxy S24" must not match "Galaxy S24 Ultra".
  const words = slugify(file.replace(/\+/g, ' plus ')).split('-');
  const modelWords = slugify(device.name.replace(/\+/g, ' plus ')).split('-');
  const start = words.findIndex((_, i) => modelWords.every((word, j) => words[i + j] === word));
  const sibling = /^(pro|plus|max|ultra|mini|lite|fe|se|neo|prime|edge|note|active|5g|xl|s|and|und|vs|with|\d{1,2})$/;
  if (start >= 0 && sibling.test(words[start + modelWords.length] ?? '')) return false;
  return start >= 0;
}

// Reviewed by eye and rejected: logo, circuit board, event crowd, packaging, novelty case or a sibling model.
const rejected = new Set(['samsung-galaxy-e7', 'xiaomi-redmi', 'sony-ericsson-w995', 'htc-one', 'nokia-lumia-1020', 'samsung-galaxy-m51', 'samsung-galaxy-watch', 'nokia-210', 'samsung-galaxy-a02s']);
const images = {};
const counts = { manufacturer: 0, techapi: 0, wikidata: 0, wikipedia: 0 };
const commons = new Map(); // file -> [{ slug, via }]
const proposed = new Set();
const propose = (file, matched, via) => {
  const name = file.replace(/_/g, ' ').trim();
  if (badFile.test(name)) return;
  for (const device of matched) {
    if (images[device.slug] || proposed.has(device.slug) || rejected.has(device.slug)) continue;
    if (!fileNamesModel(name, device)) continue;
    if (!commons.has(name)) commons.set(name, []);
    commons.get(name).push({ slug: device.slug, via });
    proposed.add(device.slug);
  }
};

// 1. Reviewed manufacturer manifests
for (const file of ['stock-photos-20261013.json', 'stock-photos-onboarding-20261022.json', 'stock-photos-tech-central.json', 'seeded-device-media.json']) {
  const parsed = JSON.parse(readFileSync(data(file), 'utf8'));
  for (const entry of parsed.images ?? parsed) {
    for (const device of byKey.get(`${entry.brand}|${modelKey(entry.brand, entry.model)}`) ?? []) {
      if (images[device.slug]) continue;
      images[device.slug] = { url: entry.image_url, page: entry.source_page, source: 'manufacturer' };
      counts.manufacturer++;
    }
  }
}

// 2a. TechAPI's own Commons links
for (const device of devices) {
  if (!device.image || images[device.slug]) continue;
  const file = decodeURIComponent(new URL(device.image.url).pathname.split('/').find((part) => /\.(jpe?g|png|webp)$/i.test(part)) ?? '');
  if (file) propose(file, [device], 'techapi');
}

// 2b. Wikidata: smartphones, phones, tablets, smartwatches, laptops and their model-series classes
const query = `SELECT DISTINCT ?label ?img WHERE {
  VALUES ?cls { wd:Q19723451 wd:Q22645 wd:Q17517 wd:Q155972 wd:Q4118085 wd:Q3962 wd:Q19723444 wd:Q10929058 wd:Q19832486 }
  ?d wdt:P31 ?cls; wdt:P18 ?img; rdfs:label|skos:altLabel ?label . FILTER(LANG(?label) = "en") }`;
const wikidata = await getJson('https://query.wikidata.org/sparql', { method: 'POST', body: new URLSearchParams({ query, format: 'json' }) });
for (const row of wikidata.results.bindings) {
  propose(decodeURIComponent(row.img.value.split('/').pop()), matchLabel(row.label.value), 'wikidata');
}

// 2c. Wikipedia lead photos, 50 titles per request
const pending = devices.filter((device) => !images[device.slug] && device.category !== 'Laptops' && device.release_date >= '2008');
const titles = new Map();
for (const device of pending) {
  const full = `${brandLabel(device.brand)} ${device.name}`;
  titles.set(/^(iPhone|iPad)/.test(device.name) || /^Redmi/.test(device.name) ? device.name : full, device);
}
const titleList = [...titles.keys()].filter((title) => !/[|#<>[\]{}]/.test(title));
for (let i = 0; i < titleList.length; i += 50) {
  const batch = titleList.slice(i, i + 50);
  const { query: result } = await post('https://en.wikipedia.org/w/api.php', {
    action: 'query', prop: 'pageimages', piprop: 'name', pilicense: 'free', pilimit: '50', redirects: '1', titles: batch.join('|')
  });
  const origin = new Map();
  for (const item of [...(result?.normalized ?? []), ...(result?.redirects ?? [])]) {
    if (!origin.has(item.to)) origin.set(item.to, []);
    origin.get(item.to).push(item.from);
  }
  const originals = (title) => [title, ...(origin.get(title) ?? []).flatMap(originals)];
  for (const page of result?.pages ?? []) {
    if (!page.pageimage) continue;
    for (const title of new Set(originals(page.title))) if (titles.has(title)) propose(page.pageimage, [titles.get(title)], 'wikipedia');
  }
  if ((i / 50) % 20 === 0) console.error(`wikipedia ${i}/${titleList.length}`);
  await sleep(150);
}

// 3. Licence details and an 800px rendition from Commons
const strip = (html) => String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();
const files = [...commons.keys()];
for (let i = 0; i < files.length; i += 50) {
  const { query: result } = await post('https://commons.wikimedia.org/w/api.php', {
    action: 'query', prop: 'imageinfo', iiprop: 'url|mime|size|extmetadata', iiurlwidth: '960',
    iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist', titles: files.slice(i, i + 50).map((file) => `File:${file}`).join('|')
  });
  const from = new Map((result.normalized ?? []).map((item) => [item.to, item.from]));
  for (const page of result.pages ?? []) {
    const info = page.imageinfo?.[0];
    const list = commons.get((from.get(page.title) ?? page.title).replace(/^File:/, '')) ?? commons.get(page.title.replace(/^File:/, ''));
    if (!info || !list || !/^image\/(jpeg|png|webp)$/.test(info.mime) || info.width < 300) continue;
    const license = strip(info.extmetadata?.LicenseShortName?.value);
    if (!/^(CC|Public domain|GFDL|FAL|Attribution|MIT|Apache)/i.test(license)) continue;
    for (const { slug, via } of list) {
      images[slug] = {
        url: info.thumburl || info.url, page: info.descriptionurl, source: `wikimedia-commons:${via}`,
        license, license_url: info.extmetadata?.LicenseUrl?.value ?? null, author: strip(info.extmetadata?.Artist?.value).slice(0, 200) || null
      };
      counts[via]++;
    }
  }
  await sleep(150);
}

// Full-size originals are rate limited by Wikimedia; use a 500px rendition where no 960px one exists.
const originals = Object.values(images).filter((image) => new URL(image.url).hostname === 'upload.wikimedia.org');
for (let i = 0; i < originals.length; i += 50) {
  const part = new Map(originals.slice(i, i + 50).map((image) => [decodeURIComponent(new URL(image.page).pathname.replace('/wiki/', '')).replace(/_/g, ' '), []]));
  for (const image of originals.slice(i, i + 50)) part.get(decodeURIComponent(new URL(image.page).pathname.replace('/wiki/', '')).replace(/_/g, ' ')).push(image);
  const { query: result } = await post('https://commons.wikimedia.org/w/api.php', {
    action: 'query', prop: 'imageinfo', iiprop: 'url', iiurlwidth: '500', titles: [...part.keys()].join('|')
  });
  for (const page of result.pages ?? []) {
    const thumb = page.imageinfo?.[0]?.thumburl;
    if (thumb) for (const image of part.get(page.title) ?? []) image.url = thumb;
  }
}

const sorted = Object.fromEntries(Object.entries(images).sort(([a], [b]) => (a < b ? -1 : 1)));
writeFileSync(data('device-images.json'), `${JSON.stringify(sorted, null, 1)}\n`);
console.log(JSON.stringify({ devices: devices.length, with_image: Object.keys(sorted).length, ...counts }, null, 2));
