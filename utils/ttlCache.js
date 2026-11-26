/**
 * Tiny in-process cache for values that are expensive to compute and fine to be a little stale
 * (catalogue counts, active brand ids). Concurrent callers share one in-flight computation.
 *
 * It lives in each server process. If the API is ever scaled to several instances and needs a
 * shared cache, this is the single place to swap in Redis.
 */
const entries = new Map();
const MAX_ENTRIES = 500;

export async function cached(key, ttlMs, compute) {
  const now = Date.now();
  const hit = entries.get(key);
  if (hit && hit.expires > now) return hit.value;
  if (hit?.pending) return hit.pending;

  const pending = Promise.resolve().then(compute);
  entries.set(key, { pending, expires: 0 });
  try {
    const value = await pending;
    if (entries.size >= MAX_ENTRIES) entries.delete(entries.keys().next().value);
    entries.set(key, { value, expires: Date.now() + ttlMs });
    return value;
  } catch (error) {
    entries.delete(key);
    throw error;
  }
}

/** Drops every entry whose key starts with prefix (call after writes that change the data). */
export function invalidate(prefix = '') {
  for (const key of entries.keys()) if (key.startsWith(prefix)) entries.delete(key);
}
