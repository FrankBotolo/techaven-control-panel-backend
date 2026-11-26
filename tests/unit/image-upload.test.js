import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import jwt from 'jsonwebtoken';
import { imageExtension, receiptExtension } from '../../utils/imageType.js';

const { default: db } = await import('../../models/index.js');
const { default: router } = await import('../../routes/uploads.js');
const { r2Configured, saveObject } = await import('../../services/storage/objectStore.js');

// Set after imports: loading the app config applies .env over existing values.
// These tests exercise the local fallback, never the real bucket.
for (const key of Object.keys(process.env)) if (key.startsWith('R2_')) delete process.env[key];
process.env.JWT_SECRET = 'isolated-upload-fixture-secret';
process.env.APP_URL = 'https://api.example.com/';
const privateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'techaven-proofs-'));
process.env.PAYMENT_PROOF_DIR = privateDir;

const png = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(16)]);
const pdf = Buffer.from('%PDF-1.7\n%fixture\n');

test('file type comes from bytes', () => {
  assert.equal(imageExtension(png), '.png');
  assert.equal(imageExtension(Buffer.from('<html><script>alert(1)</script>')), null);
  assert.equal(imageExtension(Buffer.alloc(0)), null);
  assert.equal(imageExtension(Buffer.from('RIFF0000WEBPVP8 ')), '.webp');
  assert.equal(imageExtension(Buffer.from('GIF89a0000000000')), '.gif');
  assert.equal(imageExtension(Buffer.from('ffd8ffe0000000000000000000', 'hex')), '.jpg');
  assert.equal(receiptExtension(pdf), '.pdf');
  assert.equal(receiptExtension(png), '.png');
  assert.equal(receiptExtension(Buffer.from('GIF89a0000000000')), null);
});

test('storage is R2 only when fully configured, and production never falls back to disk', async (t) => {
  const full = {
    R2_BUCKET: 'b', R2_ENDPOINT: 'https://x.r2.cloudflarestorage.com', R2_ACCESS_KEY_ID: 'k',
    R2_SECRET_ACCESS_KEY: 's', R2_PUBLIC_URL: 'https://cdn.example.com'
  };
  assert.equal(r2Configured(full), true);
  assert.equal(r2Configured({ ...full, R2_PUBLIC_URL: '' }), false);
  const previous = process.env.NODE_ENV;
  t.after(() => { process.env.NODE_ENV = previous; });
  process.env.NODE_ENV = 'production';
  await assert.rejects(saveObject('images/a.png', png, 'image/png'), { status: 503 });
  await assert.rejects(saveObject('../escape.png', png, 'image/png'), { status: 400 });
});

test('upload routes enforce roles, content and size', async (t) => {
  t.mock.method(db.User, 'findByPk', async (id) => ({
    id, is_active: true, role: { 1: 'admin', 2: 'seller', 3: 'customer' }[id]
  }));
  const server = express().use('/uploads', router).listen(0);
  t.after(async () => {
    server.close();
    await fs.rm(privateDir, { recursive: true, force: true });
  });
  const send = (route, id, bytes, field = 'file', name = 'logo.png') => {
    const body = new FormData();
    if (bytes) body.append(field, new Blob([bytes], { type: 'image/png' }), name);
    return fetch(`http://127.0.0.1:${server.address().port}/uploads/${route}`, {
      method: 'POST', body,
      headers: id ? { authorization: `Bearer ${jwt.sign({ id }, process.env.JWT_SECRET)}` } : {}
    });
  };

  assert.equal((await send('image', null, png)).status, 401);
  assert.equal((await send('image', 3, png)).status, 403);
  assert.equal((await send('image', 1)).status, 400);
  assert.equal((await send('image', 1, Buffer.from('<script>alert(1)</script>'))).status, 400);
  assert.equal((await send('image', 1, Buffer.alloc(11 * 1024 * 1024))).status, 413);
  for (const [id, field] of [[1, 'file'], [2, 'image']]) {
    const response = await send('image', id, png, field, 'logo.html');
    assert.equal(response.status, 201);
    const { data } = await response.json();
    assert.match(data.key, /^images\/[0-9a-f-]+\.png$/);
    assert.equal(data.url, `https://api.example.com/uploads/${data.key}`);
    const file = new URL(`../../uploads/${data.key}`, import.meta.url);
    assert.deepEqual(await fs.readFile(file), png);
    await fs.unlink(file);
  }

  assert.equal((await send('payment-proof', null, pdf)).status, 401);
  assert.equal((await send('payment-proof', 3, Buffer.from('GIF89a0000000000'))).status, 400);
  const proof = await send('payment-proof', 3, pdf, 'file', 'receipt.pdf');
  assert.equal(proof.status, 201);
  const { data } = await proof.json();
  assert.match(data.key, /^payment-proofs\/u3\/[0-9a-f-]{36}\.pdf$/);
  assert.equal(data.url, null, 'local receipts are private and have no public URL');
  assert.deepEqual(await fs.readFile(path.join(privateDir, ...data.key.split('/'))), pdf);
});
