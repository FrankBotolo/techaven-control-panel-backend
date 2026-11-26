import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand
} from '@aws-sdk/client-s3';

/**
 * Uploaded files go to Cloudflare R2 when R2_* is configured. Without it, development falls
 * back to local disk; production refuses so files never silently land on an ephemeral disk.
 */
const publicDir = fileURLToPath(new URL('../../uploads/', import.meta.url));
const privateDir = () => path.resolve(process.env.PAYMENT_PROOF_DIR || 'private/payment-proofs');

const settings = (env = process.env) => ({
  bucket: env.R2_BUCKET?.trim(),
  endpoint: env.R2_ENDPOINT?.trim(),
  region: env.R2_REGION?.trim() || 'auto',
  accessKeyId: env.R2_ACCESS_KEY_ID?.trim(),
  secretAccessKey: env.R2_SECRET_ACCESS_KEY?.trim(),
  publicUrl: env.R2_PUBLIC_URL?.trim().replace(/\/+$/, '')
});

export const r2Configured = (env = process.env) => {
  const s = settings(env);
  return Boolean(s.bucket && s.endpoint && s.accessKeyId && s.secretAccessKey && s.publicUrl);
};

let cached;
const client = () => {
  const s = settings();
  const signature = `${s.endpoint}|${s.accessKeyId}|${s.region}`;
  if (cached?.signature !== signature) {
    cached = {
      signature,
      s3: new S3Client({
        region: s.region,
        endpoint: s.endpoint,
        credentials: { accessKeyId: s.accessKeyId, secretAccessKey: s.secretAccessKey }
      })
    };
  }
  return cached.s3;
};

const unavailable = () =>
  Object.assign(new Error('File storage is not configured'), { status: 503 });

const KEY = /^[a-z0-9-]+(\/[a-z0-9-]+)*\/[a-z0-9-]+\.[a-z0-9]+$/i;
const assertKey = (key) => {
  if (typeof key !== 'string' || !KEY.test(key)) {
    throw Object.assign(new Error('Invalid storage key'), { status: 400 });
  }
};

const localPath = (key, visibility) =>
  path.join(visibility === 'private' ? privateDir() : publicDir, ...key.split('/'));

export const publicUrlFor = (key) => {
  if (r2Configured()) return `${settings().publicUrl}/${key}`;
  const base = (process.env.APP_URL || 'http://localhost:8000').replace(/\/+$/, '');
  return `${base}/uploads/${key}`;
};

/** Stores bytes under key and returns the URL saved in API payloads. */
export async function saveObject(key, body, contentType, { visibility = 'public' } = {}) {
  assertKey(key);
  if (r2Configured()) {
    await client().send(new PutObjectCommand({
      Bucket: settings().bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: visibility === 'private'
        ? 'private, no-store'
        : 'public, max-age=31536000, immutable'
    }));
    return { key, url: publicUrlFor(key), storage: 'r2' };
  }
  if (process.env.NODE_ENV === 'production') throw unavailable();
  const target = localPath(key, visibility);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, body, { flag: 'wx' });
  return { key, url: visibility === 'private' ? null : publicUrlFor(key), storage: 'local' };
}

export async function readObject(key, { visibility = 'public' } = {}) {
  assertKey(key);
  if (r2Configured()) {
    const result = await client().send(new GetObjectCommand({ Bucket: settings().bucket, Key: key }));
    return Buffer.from(await result.Body.transformToByteArray());
  }
  if (process.env.NODE_ENV === 'production') throw unavailable();
  return fs.readFile(localPath(key, visibility));
}

export async function objectExists(key, { visibility = 'public' } = {}) {
  assertKey(key);
  if (!r2Configured() && process.env.NODE_ENV === 'production') throw unavailable();
  try {
    if (r2Configured()) {
      await client().send(new HeadObjectCommand({ Bucket: settings().bucket, Key: key }));
    } else {
      await fs.access(localPath(key, visibility));
    }
    return true;
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound' || error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}
