import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import db from '../../models/index.js';
import ordersRouter from '../../routes/orders.js';
import sellersRouter from '../../routes/sellers.js';
import adminRouter from '../../routes/admin.js';
import { settleManualOrder } from '../../services/manual-payment-settlement.js';
import { saveObject } from '../../services/storage/objectStore.js';
import { up as upFulfilment } from '../../database/migrations-js/202611260003-order-fulfilment-flow.js';

if (process.env.DB_NAME !== 'techaven_fulfilment_test') throw new Error('This test requires the isolated scratch database');
// Proofs go to a local private directory here, never to the real R2 bucket.
for (const name of Object.keys(process.env)) if (name.startsWith('R2_')) delete process.env[name];
process.env.JWT_SECRET = 'isolated-fulfilment-fixture-secret';
process.env.PAYMENT_PROOF_DIR = await fs.mkdtemp(path.join(os.tmpdir(), 'techaven-fulfilment-'));

test('seller sends, buyer proves delivery, admin approval releases escrow exactly once', async (t) => {
  await upFulfilment({ sequelize: db.sequelize });
  await upFulfilment({ sequelize: db.sequelize });
  const admin = await db.User.create({ name: 'Holding admin', role: 'admin' });
  const buyer = await db.User.create({ name: 'Buyer', role: 'customer' });
  const stranger = await db.User.create({ name: 'Other buyer', role: 'customer' });
  const shop = await db.Shop.create({ name: `Fixture ${randomUUID().slice(0, 8)}`, status: 'active', application_status: 'approved' });
  const seller = await db.User.create({ name: 'Seller', role: 'seller', shop_id: shop.id, is_verified: true });
  const otherShop = await db.Shop.create({ name: `Other ${randomUUID().slice(0, 8)}`, status: 'active', application_status: 'approved' });
  const otherSeller = await db.User.create({ name: 'Other seller', role: 'seller', shop_id: otherShop.id, is_verified: true });

  const makeOrder = (extra = {}) => db.Order.create({
    user_id: buyer.id, seller_id: seller.id, order_number: `TEST-${randomUUID()}`,
    total_amount: '100.00', escrow_amount: '90.00', shipping_address: 'Fixture', shipping_phone: '000',
    status: 'pending', payment_status: 'pending', ...extra
  });
  const pay = (order) => db.sequelize.transaction((transaction) => settleManualOrder(order, `fixture_${order.id}`, transaction));
  const order = await makeOrder({ courier_service: 'Fixture Courier' });
  const unpaid = await makeOrder({ fulfilment_type: 'pickup' });
  await pay(order);

  const app = express().use(express.json());
  app.use('/api/orders', ordersRouter).use('/api/sellers', sellersRouter).use('/api/admin', adminRouter);
  const server = app.listen(0);
  t.after(async () => { server.close(); await fs.rm(process.env.PAYMENT_PROOF_DIR, { recursive: true, force: true }); });
  const call = (user, url, method = 'GET', body) => fetch(`http://127.0.0.1:${server.address().port}/api${url}`, {
    method,
    headers: { 'content-type': 'application/json', ...(user ? { authorization: `Bearer ${jwt.sign({ id: user.id }, process.env.JWT_SECRET)}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const proofKey = async (user) => {
    const key = `delivery-proofs/u${user.id}/${randomUUID()}.png`;
    await saveObject(key, Buffer.from('89504e470d0a1a0a', 'hex'), 'image/png', { visibility: 'private' });
    return key;
  };
  const balance = async (user) => Number((await db.Wallet.findOne({ where: { user_id: user.id } }))?.balance ?? 0);
  const holdingBefore = await balance(admin);

  await t.test('only the owning seller can send, and only once paid', async () => {
    assert.equal((await call(otherSeller, `/sellers/orders/${order.id}/dispatch`, 'POST', {})).status, 404);
    assert.equal((await call(seller, `/sellers/orders/${unpaid.id}/dispatch`, 'POST', {})).status, 409);
    assert.equal((await call(buyer, `/orders/${order.id}/delivery/proof`, 'POST', { proof_key: await proofKey(buyer) })).status, 409, 'not sent yet');
    assert.equal((await call(seller, `/orders/${order.id}/status`, 'PATCH', { status: 'delivered' })).status, 403, 'sellers cannot mark delivered');
    assert.equal((await call(otherSeller, `/orders/${order.id}/status`, 'PATCH', { status: 'shipped' })).status, 404, 'sellers cannot touch others\' orders');
    const sent = await call(seller, `/sellers/orders/${order.id}/dispatch`, 'POST', { tracking_number: 'TRK-1' });
    assert.equal(sent.status, 200, await sent.clone().text());
    const row = await order.reload();
    assert.equal(row.status, 'shipped');
    assert.equal(row.courier_tracking_number, 'TRK-1');
    assert.ok(row.dispatched_at);
    assert.equal((await call(seller, `/sellers/orders/${order.id}/dispatch`, 'POST', {})).status, 200, 'repeat is harmless');
  });

  await t.test('buyer proof needs their own uploaded key and waits for review', async () => {
    assert.equal((await call(buyer, `/orders/${order.id}/delivery/proof`, 'POST', { proof_key: await proofKey(stranger) })).status, 400);
    assert.equal((await call(buyer, `/orders/${order.id}/delivery/proof`, 'POST', { proof_key: `delivery-proofs/u${buyer.id}/${randomUUID()}.png` })).status, 400, 'missing file');
    assert.equal((await call(stranger, `/orders/${order.id}/delivery/proof`, 'POST', { proof_key: await proofKey(stranger) })).status, 404);
    const submitted = await call(buyer, `/orders/${order.id}/delivery/proof`, 'POST', { proof_key: await proofKey(buyer) });
    assert.equal(submitted.status, 201, await submitted.clone().text());
    const row = await order.reload();
    assert.equal(row.status, 'delivered');
    assert.equal(row.delivery_proof_status, 'pending_review');
    assert.equal(row.escrow_status, 'held', 'no money moves before approval');
    assert.equal(await balance(seller), 0);
    assert.equal((await call(buyer, `/orders/${order.id}/delivery/proof`, 'POST', { proof_key: await proofKey(buyer) })).status, 409);
    assert.equal((await call(stranger, `/orders/${order.id}/delivery/proof`)).status, 404);
    const file = await call(seller, `/orders/${order.id}/delivery/proof`);
    assert.equal(file.status, 200);
    assert.equal(file.headers.get('content-type'), 'image/png');
  });

  await t.test('admin rejection sends it back for a new upload', async () => {
    assert.equal((await call(seller, `/admin/orders/${order.id}/delivery/reject`, 'POST', { reason: 'x' })).status, 403);
    assert.equal((await call(admin, `/admin/orders/${order.id}/delivery/reject`, 'POST', { reason: '' })).status, 400);
    assert.equal((await call(admin, `/admin/orders/${order.id}/delivery/reject`, 'POST', { reason: 'Photo is blurry' })).status, 200);
    const row = await order.reload();
    assert.equal(row.status, 'shipped');
    assert.equal(row.delivery_proof_status, 'rejected');
    const queue = await (await call(admin, '/admin/delivery-proofs?status=rejected')).json();
    assert.ok(queue.data.orders.some((item) => item.id === order.id && !('delivery_proof_key' in item)));
    assert.equal((await call(buyer, `/orders/${order.id}/delivery/proof`, 'POST', { proof_key: await proofKey(buyer) })).status, 201);
  });

  await t.test('approval moves escrow to the seller once, even when sent twice at the same time', async () => {
    const pending = await (await call(admin, '/admin/delivery-proofs')).json();
    assert.ok(pending.data.orders.some((item) => item.id === order.id));
    const results = await Promise.all([
      call(admin, `/admin/orders/${order.id}/delivery/approve`, 'POST', {}),
      call(admin, `/admin/orders/${order.id}/delivery/approve`, 'POST', {})
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 200]);
    const row = await order.reload();
    assert.equal(row.escrow_status, 'released');
    assert.equal(row.delivery_proof_status, 'approved');
    assert.equal(await balance(seller), 90, 'seller credited exactly once');
    assert.equal(await balance(admin), holdingBefore - 90, 'holding wallet debited exactly once');
    assert.equal((await db.Escrow.findOne({ where: { order_id: order.id } })).status, 'released');
    const credits = await db.WalletTransaction.count({ where: { user_id: seller.id, type: 'credit', status: 'completed' } });
    assert.equal(credits, 1);
    assert.equal((await call(admin, `/admin/orders/${order.id}/delivery/approve`, 'POST', {})).status, 200, 'retry is a no-op');
    assert.equal(await balance(seller), 90);
    assert.equal((await call(buyer, `/orders/${order.id}`)).status, 200);
  });

  await t.test('legacy confirm endpoint submits for review instead of paying out', async () => {
    const second = await makeOrder();
    await pay(second);
    await call(seller, `/sellers/orders/${second.id}/dispatch`, 'POST', {});
    const confirmed = await call(buyer, `/orders/${second.id}/delivery/confirm`, 'POST', { file_url: 'https://example.com/proof.jpg' });
    assert.equal(confirmed.status, 200, await confirmed.clone().text());
    const row = await second.reload();
    assert.equal(row.escrow_status, 'held');
    assert.equal(row.delivery_proof_status, 'pending_review');
    assert.equal(await balance(seller), 90, 'unchanged until approval');
  });
});
