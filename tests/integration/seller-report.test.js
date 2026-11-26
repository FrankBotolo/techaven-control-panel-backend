import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import db from '../../models/index.js';
import { getSellerReport } from '../../controllers/SellerReportController.js';
import { up as upFulfilment } from '../../database/migrations-js/202611260003-order-fulfilment-flow.js';

if (process.env.DB_NAME !== 'techaven_report_test') throw new Error('This test requires the isolated scratch database');

const call = (user, query) => new Promise((resolve) => {
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { resolve({ status: this.statusCode, body }); } };
  getSellerReport({ query, user }, res);
});

test('seller report is scoped to the seller and adds up their sales', async () => {
  await upFulfilment({ sequelize: db.sequelize });
  const shopA = await db.Shop.create({ name: 'Alpha', status: 'active', application_status: 'approved' });
  const shopB = await db.Shop.create({ name: 'Beta', status: 'active', application_status: 'approved' });
  const sellerA = await db.User.create({ name: 'Seller A', role: 'seller', shop_id: shopA.id });
  const sellerB = await db.User.create({ name: 'Seller B', role: 'seller', shop_id: shopB.id });
  const buyer1 = await db.User.create({ name: 'Buyer One', role: 'customer' });
  const buyer2 = await db.User.create({ name: 'Buyer Two', role: 'customer' });

  const order = async (seller, buyer, extra, items) => {
    const row = await db.Order.create({
      user_id: buyer.id, seller_id: seller.id, order_number: `S-${randomUUID().slice(0, 8)}`, shipping_address: 'x', shipping_phone: '0',
      status: 'processing', payment_status: 'paid', escrow_status: 'held', ...extra
    });
    for (const [name, quantity, subtotal] of items) await db.OrderItem.create({ order_id: row.id, product_name: name, quantity, price: subtotal / quantity, subtotal });
    return row;
  };
  // Friday 13 Nov 2026, paid 08:00 Malawi time, sent 2 hours later, delivered and paid out.
  await order(sellerA, buyer1, {
    total_amount: 1000, platform_fee_amount: 100, escrow_amount: 900, paid_at: new Date('2026-11-13T06:00:00Z'),
    dispatched_at: new Date('2026-11-13T08:00:00Z'), status: 'delivered', escrow_status: 'released', delivery_proof_status: 'approved',
    funds_released_at: new Date('2026-11-15T10:00:00Z'), courier_service: 'CTS'
  }, [['Phone X', 2, 1000]]);
  // Paid, not yet sent (to send), collect at shop.
  await order(sellerA, buyer2, { total_amount: 500, platform_fee_amount: 50, escrow_amount: 450, paid_at: new Date('2026-11-16T09:00:00Z'), fulfilment_type: 'pickup' }, [['Case', 5, 500]]);
  // Sent 30 hours after payment; buyer proof awaiting approval.
  await order(sellerA, buyer1, {
    total_amount: 300, platform_fee_amount: 30, escrow_amount: 270, paid_at: new Date('2026-11-17T09:00:00Z'),
    dispatched_at: new Date('2026-11-18T15:00:00Z'), status: 'delivered', delivery_proof_status: 'pending_review'
  }, [['Phone X', 1, 300]]);
  await order(sellerA, buyer2, { total_amount: 80, payment_status: 'pending', escrow_status: 'pending', paid_at: null }, [['Cable', 1, 80]]);
  await order(sellerA, buyer2, { total_amount: 70, status: 'cancelled', payment_status: 'pending', escrow_status: 'pending', paid_at: null }, [['Cable', 1, 70]]);
  // Another seller's sale must never appear.
  await order(sellerB, buyer1, { total_amount: 99999, platform_fee_amount: 9999, escrow_amount: 90000, paid_at: new Date('2026-11-14T09:00:00Z') }, [['Other shop item', 9, 99999]]);

  await db.Wallet.create({ user_id: sellerA.id, balance: 900, currency: 'MWK' });
  await db.WithdrawalRequest.create({ user_id: sellerA.id, amount: 400, status: 'pending', withdrawal_method: 'mobile_money' });
  await db.WithdrawalRequest.create({ user_id: sellerB.id, amount: 5000, status: 'completed', withdrawal_method: 'bank_transfer', processed_at: new Date('2026-11-20T10:00:00Z') });

  const { status, body } = await call(sellerA, { from: '2026-11-01', to: '2026-11-30', granularity: 'week' });
  assert.equal(status, 200, JSON.stringify(body));
  const r = body.data;
  assert.deepEqual(
    { orders: r.summary.orders, items: r.summary.items_sold, gross: r.summary.gross_sales, commission: r.summary.commission, net: r.summary.net_earnings, buyers: r.summary.buyers },
    { orders: 3, items: 8, gross: 1800, commission: 180, net: 1620, buyers: 2 }
  );
  assert.equal(r.summary.released, 900);
  assert.deepEqual({ unpaid: r.summary.unpaid, unpaid_value: r.summary.unpaid_value, cancelled: r.summary.cancelled }, { unpaid: 1, unpaid_value: 80, cancelled: 1 });
  assert.equal(r.summary.best_weekday, 'Friday');
  assert.deepEqual(
    { in_escrow: r.now.in_escrow, to_send: r.now.to_send, awaiting_approval: r.now.awaiting_approval, approval_amount: r.now.approval_amount, wallet: r.now.wallet_balance, pending: r.now.pending_withdrawals.amount },
    { in_escrow: 720, to_send: 1, awaiting_approval: 1, approval_amount: 270, wallet: 900, pending: 400 }
  );
  assert.equal(r.fulfilment.sent, 2);
  assert.equal(r.fulfilment.average_hours_to_send, 16, '(2h + 30h) / 2');
  assert.equal(r.fulfilment.sent_within_a_day, 50);
  assert.equal(r.fulfilment.by_type.find((t) => t.type === 'pickup').orders, 1);
  assert.equal(r.products[0].product, 'Case');
  assert.equal(r.products.find((p) => p.product === 'Phone X').quantity, 3);
  assert.ok(!JSON.stringify(r).includes('Other shop item'), 'no other seller data');
  assert.ok(!JSON.stringify(r).includes('99999'));
  assert.equal(r.withdrawals.rows.length, 1);
  assert.equal(r.orders.length, 5, 'paid in range plus unpaid/cancelled placed in range');
  assert.equal(r.series.find((row) => row.bucket === '2026-11-09').gross, 1000);

  const other = (await call(sellerB, { from: '2026-11-01', to: '2026-11-30' })).body.data;
  assert.equal(other.summary.gross_sales, 99999);
  assert.ok(!JSON.stringify(other).includes('Phone X'));
});
