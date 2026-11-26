import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import db from '../../models/index.js';
import { getReport } from '../../controllers/AdminReportController.js';
import { up as upFulfilment } from '../../database/migrations-js/202611260003-order-fulfilment-flow.js';

if (process.env.DB_NAME !== 'techaven_report_test') throw new Error('This test requires the isolated scratch database');

const call = (query) => new Promise((resolve) => {
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { resolve({ status: this.statusCode, body }); } };
  getReport({ query }, res);
});

test('admin report totals, Malawi-day buckets and sections', async () => {
  await upFulfilment({ sequelize: db.sequelize });
  const shopA = await db.Shop.create({ name: 'Alpha Phones', status: 'active', application_status: 'approved' });
  const shopB = await db.Shop.create({ name: 'Beta Tech', status: 'active', application_status: 'approved' });
  const sellerA = await db.User.create({ name: 'Seller A', role: 'seller', shop_id: shopA.id });
  const sellerB = await db.User.create({ name: 'Seller B', role: 'seller', shop_id: shopB.id });
  const buyer = await db.User.create({ name: 'Buyer', role: 'customer' });

  const order = async (seller, paidAt, total, fee, items, extra = {}) => {
    const row = await db.Order.create({
      user_id: buyer.id, seller_id: seller.id, order_number: `R-${randomUUID().slice(0, 8)}`, total_amount: total,
      platform_fee_amount: fee, escrow_amount: total - fee, shipping_address: 'x', shipping_phone: '0',
      status: 'processing', payment_status: 'paid', escrow_status: 'held', paid_at: paidAt, ...extra
    });
    for (const [name, quantity, subtotal] of items) {
      await db.OrderItem.create({ order_id: row.id, product_name: name, quantity, price: subtotal / quantity, subtotal });
    }
    return row;
  };
  // 23:30 UTC on 10 Nov is 01:30 on 11 Nov in Malawi.
  await order(sellerA, new Date('2026-11-10T23:30:00Z'), 1000, 100, [['Phone X', 2, 1000]], { escrow_status: 'released', funds_released_at: new Date('2026-11-12T10:00:00Z') });
  await order(sellerA, new Date('2026-11-03T08:00:00Z'), 500, 50, [['Phone X', 1, 300], ['Case', 3, 200]]);
  await order(sellerB, new Date('2026-11-11T09:00:00Z'), 2000, 200, [['Laptop', 1, 2000]], { delivery_proof_status: 'pending_review' });
  // Excluded: cancelled, unpaid, and outside the range.
  await order(sellerB, new Date('2026-11-05T09:00:00Z'), 9999, 999, [['Ghost', 9, 9999]], { status: 'cancelled', escrow_status: 'refunded' });
  await order(sellerB, null, 7777, 777, [['Unpaid', 7, 7777]], { payment_status: 'pending', escrow_status: 'pending' });
  await order(sellerB, new Date('2026-10-31T21:59:00Z'), 4444, 444, [['Too early', 4, 4444]]);

  await db.WithdrawalRequest.create({ user_id: sellerA.id, amount: 600, status: 'completed', withdrawal_method: 'mobile_money', processed_at: new Date('2026-11-13T10:00:00Z') });
  await db.WithdrawalRequest.create({ user_id: sellerB.id, amount: 300, status: 'pending', withdrawal_method: 'bank_transfer' });

  const pkg = await db.SubscriptionPackage.create({ slug: `pkg-${randomUUID().slice(0, 6)}`, name: 'Starter', price_mwk: 5000, billing_period: 'monthly', duration_days: 30 });
  await db.ShopSubscription.create({ shop_id: shopA.id, package_id: pkg.id, status: 'active', payment_status: 'paid', current_period_start: new Date('2026-11-02T08:00:00Z'), metadata: { amount_reported: '4500' } });
  await db.ShopSubscription.create({ shop_id: shopB.id, package_id: pkg.id, status: 'active', payment_status: 'paid', current_period_start: new Date('2026-11-11T08:00:00Z') });
  await db.ShopSubscription.create({ shop_id: shopB.id, package_id: pkg.id, status: 'pending_payment', payment_status: 'pending', current_period_start: new Date('2026-11-11T08:00:00Z') });

  const { status, body } = await call({ from: '2026-11-01', to: '2026-11-30', granularity: 'day' });
  assert.equal(status, 200, JSON.stringify(body));
  const r = body.data;
  assert.deepEqual(
    { orders: r.summary.orders, items: r.summary.items_sold, gross: r.summary.gross_sales, commission: r.summary.commission, seller: r.summary.seller_share },
    { orders: 3, items: 7, gross: 3500, commission: 350, seller: 3150 }
  );
  assert.equal(r.summary.subscription_income, 9500, 'reported amount 4500 + package price 5000; unpaid excluded');
  assert.equal(r.summary.platform_revenue, 9850);
  assert.equal(r.series.length, 30);
  const day = (key) => r.series.find((row) => row.bucket === key);
  assert.equal(day('2026-11-10').gross, 0, 'late-evening UTC payment belongs to the next Malawi day');
  assert.equal(day('2026-11-11').gross, 3000);
  assert.equal(day('2026-11-11').items, 3);
  assert.equal(day('2026-11-03').items, 4);
  assert.equal(day('2026-11-11').subscriptions, 5000);

  const alpha = r.shops.find((row) => row.shop === 'Alpha Phones');
  assert.deepEqual({ orders: alpha.orders, items: alpha.items, gross: alpha.gross, released: alpha.released, held: alpha.held }, { orders: 2, items: 6, gross: 1500, released: 900, held: 450 });
  assert.equal(r.products.find((row) => row.product === 'Phone X').quantity, 3);
  assert.ok(!r.products.some((row) => ['Ghost', 'Unpaid', 'Too early'].includes(row.product)));

  assert.equal(r.escrow.released, 900);
  assert.equal(r.escrow.awaiting_approval_now, 1);
  assert.equal(r.escrow.held_now, 450 + 1800 + 4000, 'current balance, not limited to the range');
  assert.equal(r.payouts.total, 600);
  assert.equal(r.payout_requests.pending_now.amount, 300);
  assert.equal(r.payout_requests.by_status.completed, 1);
  assert.equal(r.subscriptions.by_package[0].amount, 9500);

  const weekly = (await call({ from: '2026-11-01', to: '2026-11-30', granularity: 'week' })).body.data;
  assert.equal(weekly.series[0].bucket, '2026-10-26', 'weeks start on Monday');
  assert.equal(weekly.series.find((row) => row.bucket === '2026-11-09').gross, 3000);
  const monthly = (await call({ from: '2026-10-01', to: '2026-11-30', granularity: 'month' })).body.data;
  assert.deepEqual(monthly.series.map((row) => [row.bucket, row.gross]), [['2026-10', 4444], ['2026-11', 3500]], '21:59 UTC on 31 Oct is 23:59 in Malawi: October, not November');

  assert.equal((await call({ from: '2026-11-30', to: '2026-11-01' })).status, 400);
  assert.equal((await call({ from: '2024-01-01', to: '2026-11-30', granularity: 'day' })).status, 400);
});
