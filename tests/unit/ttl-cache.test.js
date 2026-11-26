import test from 'node:test';
import assert from 'node:assert/strict';
import { cached, invalidate } from '../../utils/ttlCache.js';

test('caches a value until it expires, sharing one computation between concurrent callers', async () => {
  let calls = 0;
  const compute = async () => { calls += 1; await new Promise((r) => setTimeout(r, 10)); return calls; };
  const [a, b] = await Promise.all([cached('t:shared', 1000, compute), cached('t:shared', 1000, compute)]);
  assert.equal(a, 1);
  assert.equal(b, 1);
  assert.equal(await cached('t:shared', 1000, compute), 1);
  assert.equal(calls, 1);

  await cached('t:short', 5, compute);
  await new Promise((r) => setTimeout(r, 15));
  assert.equal(await cached('t:short', 5, compute), 3, 'expired entries are recomputed');
});

test('invalidate clears matching keys and failures are not cached', async () => {
  let n = 0;
  await cached('catalogue:x', 60_000, async () => ++n);
  await cached('other:y', 60_000, async () => ++n);
  invalidate('catalogue:');
  assert.equal(await cached('catalogue:x', 60_000, async () => ++n), 3);
  assert.equal(await cached('other:y', 60_000, async () => ++n), 2);

  await assert.rejects(cached('t:fail', 60_000, async () => { throw new Error('db down'); }));
  assert.equal(await cached('t:fail', 60_000, async () => 'recovered'), 'recovered');
});
