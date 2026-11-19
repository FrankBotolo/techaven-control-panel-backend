import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeTechApiRecord } from '../../services/catalogue/importers/techapi/normalizer.js';

async function fixture(name) { return JSON.parse(await readFile(new URL(`../fixtures/techapi/${name}`, import.meta.url), 'utf8')); }

test('normalizes a verified TechAPI base record', async () => {
  const result = normalizeTechApiRecord({ record: await fixture('galaxy-a26.json'), relativePath: 'samsung/2025/galaxy-a26.json' }, 'abc123');
  assert.equal(result.device.slug, 'galaxy-a26');
  assert.equal(result.device.verification_status, 'verified');
  assert.equal(result.variant.storage_gb, 128);
});

test('repairs memory-bearing base_model_slug for variants', async () => {
  const result = normalizeTechApiRecord({ record: await fixture('galaxy-a26-variant.json'), relativePath: 'samsung/2025/galaxy-a26-8gb-ram-256gb/variant.json' });
  assert.equal(result.device.slug, 'galaxy-a26');
  assert.equal(result.variant.canonical_key, 'galaxy-a26|8|256|5G|global|na');
});

test('rejects records without required identity', () => {
  const result = normalizeTechApiRecord({ record: {}, relativePath: 'bad.json' });
  assert.equal(result.error.code, 'INVALID_RECORD');
});
