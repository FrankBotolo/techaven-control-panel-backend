import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import db from '../../models/index.js';
import paymentRouter from '../../routes/payment-methods.js';
import userRouter from '../../routes/user.js';
import { up } from '../../database/migrations-js/202611070001-customer-setup.js';

if (process.env.DB_NAME !== 'techaven_customer_setup_test') throw new Error('Requires the isolated customer setup scratch database');
process.env.JWT_SECRET = 'isolated-customer-setup-test-secret';
test('customer setup migration and owner-scoped payment preference lifecycle', async t => {
  let server;
  try {
    await db.sequelize.sync({ force: true });
    const q = db.sequelize.getQueryInterface();
    for (const field of ['onboarding_required', 'address_completed_at', 'payment_setup_status']) await q.removeColumn('users', field);
    await db.sequelize.query("INSERT INTO users (name,role,createdAt,updatedAt) VALUES ('Existing customer','customer',NOW(),NOW())");
    await up({ sequelize: db.sequelize });
    await up({ sequelize: db.sequelize });
    const existing = await db.User.findOne({ where: { name: 'Existing customer' } });
    assert.equal(existing.onboarding_required, false);
    await db.sequelize.query("INSERT INTO users (name,role,createdAt,updatedAt) VALUES ('SQL customer','customer',NOW(),NOW())");
    assert.equal((await db.User.findOne({ where: { name: 'SQL customer' } })).onboarding_required, true);
    const customer = await db.User.create({ name: 'New customer', role: 'customer' });
    const stranger = await db.User.create({ name: 'Other customer', role: 'customer' });
    await db.PaymentMethod.create({ name: 'Airtel Money', slug: 'airtel-money', psp_id: 1, provider: 'airtel' });
    const app = express(); app.use(express.json()); app.use('/payment-methods', paymentRouter); app.use('/user', userRouter);
    server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    const call = (user, path, method = 'GET', body) => fetch(`http://127.0.0.1:${server.address().port}${path}`, { method, headers: { Authorization: `Bearer ${jwt.sign({ id: user.id }, process.env.JWT_SECRET)}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const payload = { type: 'mobile_money', provider: 'airtel-money', phone_number: '0983780656' };
    await t.test('address required only for new accounts and cannot be bypassed by completion request', async () => {
      assert.equal((await (await call(existing, '/user/setup')).json()).data.requires_address, false);
      assert.equal((await (await call(customer, '/user/setup')).json()).data.requires_address, true);
      assert.equal((await call(customer, '/user/setup/address-complete', 'POST')).status, 409);
      assert.equal((await call(customer, '/user/setup/payment-skip', 'POST')).status, 409);
      assert.equal((await call(customer, '/payment-methods', 'POST', payload)).status, 409);
      await db.ShippingAddress.create({ user_id: stranger.id, name: 'Other address', phone: '000', city: 'Lilongwe', address: 'Other street' });
      assert.equal((await call(customer, '/user/setup/address-complete', 'POST')).status, 409);
      await db.ShippingAddress.create({ user_id: customer.id, name: 'Customer address', phone: '000', city: 'Lilongwe', address: 'Street' });
      assert.equal((await call(customer, '/user/setup/address-complete', 'POST')).status, 200);
      assert.equal((await (await call(customer, '/user/setup')).json()).data.offer_payment_setup, true);
    });
    let saved;
    await t.test('validate, persist, deduplicate and isolate payment numbers without silently changing contacts', async () => {
      assert.equal((await call(customer, '/payment-methods', 'POST', { ...payload, phone_number: 'bad' })).status, 400);
      assert.equal((await call(customer, '/payment-methods', 'POST', { ...payload, provider: 'unknown' })).status, 400);
      const response = await call(customer, '/payment-methods', 'POST', payload); assert.equal(response.status, 201, await response.clone().text()); saved = (await response.json()).data;
      assert.equal(saved.phone_number, '+265983780656'); assert.equal(saved.is_default, true);
      assert.equal((await db.User.findByPk(customer.id)).phone_number, null);
      await call(customer, '/payment-methods', 'POST', payload);
      assert.equal((await (await call(customer, '/payment-methods')).json()).data.payment_methods.length, 1);
      assert.equal((await (await call(stranger, '/payment-methods')).json()).data.payment_methods.length, 0);
      assert.equal((await call(stranger, `/payment-methods/${saved.id}`, 'DELETE')).status, 404);
      assert.equal((await call(customer, '/payment-methods', 'POST', { ...payload, use_for_contact: true })).status, 201);
      assert.equal((await db.User.findByPk(customer.id)).phone_number, '+265983780656');
      await call(stranger, '/user/setup/address-complete', 'POST');
      assert.equal((await call(stranger, '/payment-methods', 'POST', { ...payload, use_for_contact: true })).status, 409);
      assert.equal((await (await call(stranger, '/payment-methods')).json()).data.payment_methods.length, 0);
      assert.equal((await (await call(customer, '/user/setup')).json()).data.offer_payment_setup, false);
      await call(customer, '/user/setup/payment-skip', 'POST');
      assert.equal((await db.User.findByPk(customer.id)).payment_setup_status, 'completed');
    });
    await t.test('remove defaults safely and remember optional setup dismissal', async () => {
      const other = await call(customer, '/payment-methods', 'POST', { ...payload, phone_number: '+265991234567', is_default: true }); assert.equal(other.status, 201);
      assert.equal((await call(customer, `/payment-methods/${(await other.json()).data.id}`, 'DELETE')).status, 200);
      const remaining = (await (await call(customer, '/payment-methods')).json()).data.payment_methods;
      assert.equal(remaining[0].is_default, true);
      assert.equal((await call(customer, `/payment-methods/${saved.id}`, 'DELETE')).status, 200);
      assert.equal((await call(existing, '/user/setup/payment-skip', 'POST')).status, 200);
      assert.equal((await db.User.findByPk(existing.id)).payment_setup_status, 'skipped');
      assert.equal((await call(stranger, '/user/setup/payment-skip', 'POST')).status, 200);
      assert.equal((await (await call(stranger, '/user/setup')).json()).data.offer_payment_setup, false);
      assert.equal((await db.User.findByPk(stranger.id)).payment_setup_status, 'skipped');
    });
  } finally { if (server) await new Promise(resolve => server.close(resolve)); await db.sequelize.close(); }
});
