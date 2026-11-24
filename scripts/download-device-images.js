/**
 * Downloads the photos in scripts/data/device-images.json into UPLOAD root: uploads/devices/<slug>.<ext>
 * and records them in uploads/devices/index.json. Never touches a database. Resumable: finished files are skipped.
 *   node scripts/download-device-images.js [--limit N]
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const args = process.argv.slice(2);
const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity;
const directory = fileURLToPath(new URL('../uploads/devices/', import.meta.url));
const indexPath = path.join(directory, 'index.json');
mkdirSync(directory, { recursive: true });
const images = JSON.parse(readFileSync(new URL('./data/device-images.json', import.meta.url), 'utf8'));
const index = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf8')) : {};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const save = () => {
  writeFileSync(`${indexPath}.tmp`, `${JSON.stringify(index, null, 1)}\n`);
  renameSync(`${indexPath}.tmp`, indexPath);
};

/** Trust the bytes, not the Content-Type header. */
function extension(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpg';
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  return null;
}

async function download(url) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, { headers: { 'user-agent': 'device-catalogue-seeder/1.0' }, signal: AbortSignal.timeout(45000) });
    if (response.ok) {
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > 10 * 1024 * 1024) throw new Error('Image larger than 10MB');
      return bytes;
    }
    await response.body?.cancel();
    if (attempt >= 4 || (response.status !== 429 && response.status < 500)) throw new Error(`HTTP ${response.status}`);
    const wait = Math.max(Number(response.headers.get('retry-after')) * 1000 || 0, 5000 * (attempt + 1));
    console.error(`${new URL(url).host} HTTP ${response.status}, waiting ${Math.round(wait / 1000)}s`);
    await sleep(wait);
  }
}

const report = { downloaded: 0, already_present: 0, failed: [] };
// One polite queue per site: a throttled site does not hold up the others.
const site = (url) => new URL(url).hostname;
const queues = Map.groupBy(Object.entries(images), ([, image]) => site(image.url));
const delays = { 'thumb.wikimedia.org': 1000, 'upload.wikimedia.org': 15000 };
await Promise.all([...queues].map(async ([host, entries]) => {
  for (const [slug, image] of entries) {
    if (!/^[a-z0-9-]+$/.test(slug) || !image.url.startsWith('https://')) { report.failed.push([slug, 'unsafe entry']); continue; }
    const known = index[slug];
    if (known?.origin_url === image.url && existsSync(path.join(directory, known.file))) { report.already_present++; continue; }
    if (report.downloaded >= limit) return;
    try {
      const bytes = await download(image.url);
      const ext = extension(bytes);
      if (!ext || bytes.length < 1024) throw new Error('Not a usable JPEG, PNG or WebP image');
      const file = `${slug}.${ext}`;
      writeFileSync(path.join(directory, file), bytes);
      const { url: origin_url, ...provenance } = image;
      index[slug] = { file, bytes: bytes.length, origin_url, ...provenance };
      report.downloaded++;
      save();
      if (report.downloaded % 25 === 0) console.error(`${report.downloaded} downloaded`);
    } catch (error) {
      report.failed.push([slug, error.message]);
    }
    await sleep(delays[host] ?? 500);
  }
}));
save();
console.log(JSON.stringify({ requested: Object.keys(images).length, ...report }, null, 2));
