import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMediaEntry } from '../../scripts/backfill-device-media.js';

const entry = { device_id: 26953, device_slug: 'galaxy-a05', model: 'Galaxy A05', brand: 'samsung',
  source_page: 'https://www.samsung.com/africa_en/smartphones/galaxy-a/galaxy-a05-black-128gb-sm-a055fzkgafc/',
  image_url: 'https://images.samsung.com/is/image/samsung/galaxy-a05.png' };

test('media backfill requires exact identity and manufacturer source domains', () => {
  assert.doesNotThrow(() => validateMediaEntry(entry));
  assert.throws(() => validateMediaEntry({ ...entry, device_id: 0 }), /exact device identity/);
  assert.throws(() => validateMediaEntry({ ...entry, source_page: 'https://samsung.com.example.org/a05' }), /Manufacturer/);
  assert.throws(() => validateMediaEntry({ ...entry, image_url: 'https://example.org/a05.png' }), /Manufacturer/);
  assert.throws(() => validateMediaEntry({ ...entry, image_url: 'http://images.samsung.com/a05.png' }), /Manufacturer/);
  assert.throws(() => validateMediaEntry({ ...entry, image_url: 'https://user:secret@images.samsung.com/a05.png' }), /Manufacturer/);
});
