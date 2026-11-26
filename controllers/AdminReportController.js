import db from '../models/index.js';
import { TIMEZONE_LABEL, bucket, bucketKeys, num, parsePeriod, toNumbers } from '../utils/reportPeriods.js';

/**
 * GET /api/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD&granularity=day|week|month
 *
 * One payload for the admin Reports page: platform revenue, items sold per shop and product, escrow,
 * completed payouts, payout requests and subscription income. Dates are Malawi calendar days
 * (Africa/Blantyre, UTC+2, no daylight saving); `to` is inclusive.
 *
 * Basis (stated in the response so exports carry it):
 *  - Sales count orders with payment_status 'paid' (not cancelled), dated by paid_at.
 *  - Platform commission is orders.platform_fee_amount; seller share is orders.escrow_amount.
 *  - Subscription income counts paid shop subscriptions, dated by the period start, at the amount
 *    reported by the payment provider or else the package price.
 */
const ROW_CAP = 5000;

const SUB_AMOUNT = `COALESCE(
  CASE WHEN JSON_VALID(ss.metadata) AND JSON_UNQUOTE(JSON_EXTRACT(ss.metadata, '$.amount_reported')) REGEXP '^[0-9]+(\\\\.[0-9]+)?$'
       THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(ss.metadata, '$.amount_reported')) AS DECIMAL(12,2)) END,
  p.price_mwk, 0)`;
const SUB_DATE = 'COALESCE(ss.current_period_start, ss.updatedAt)';
const PAID_ORDERS = "o.payment_status = 'paid' AND o.status <> 'cancelled' AND o.paid_at >= :start AND o.paid_at < :end";

export const getReport = async (req, res) => {
  try {
    const period = parsePeriod(req.query);
    if (period.error) return res.status(400).json({ success: false, message: period.error });
    const { from, to, granularity, replacements } = period;
    const query = async (sql) => (await db.sequelize.query(sql, { replacements, type: db.sequelize.QueryTypes.SELECT }));
    const shopOf = (alias) => `COALESCE(s.name, ${alias}.name, 'Unassigned')`;

    const [
      [sales], [items], salesSeries, itemsSeries, subsSeries, shops, products,
      escrowRows, [escrowNow], [escrowPeriod],
      payouts, requests, [pendingNow],
      subscriptions, [subsNow], byPackage
    ] = await Promise.all([
      query(`SELECT COUNT(*) orders, COALESCE(SUM(o.total_amount),0) gross, COALESCE(SUM(o.platform_fee_amount),0) commission,
               COALESCE(SUM(o.escrow_amount),0) seller_share, COUNT(DISTINCT o.user_id) buyers, COUNT(DISTINCT o.seller_id) sellers
             FROM orders o WHERE ${PAID_ORDERS}`),
      query(`SELECT COALESCE(SUM(i.quantity),0) items FROM order_items i JOIN orders o ON o.id = i.order_id WHERE ${PAID_ORDERS}`),
      query(`SELECT ${bucket('o.paid_at', granularity)} bucket, COUNT(*) orders, COALESCE(SUM(o.total_amount),0) gross,
               COALESCE(SUM(o.platform_fee_amount),0) commission
             FROM orders o WHERE ${PAID_ORDERS} GROUP BY bucket`),
      query(`SELECT ${bucket('o.paid_at', granularity)} bucket, COALESCE(SUM(i.quantity),0) items
             FROM order_items i JOIN orders o ON o.id = i.order_id WHERE ${PAID_ORDERS} GROUP BY bucket`),
      query(`SELECT ${bucket(SUB_DATE, granularity)} bucket, COALESCE(SUM(${SUB_AMOUNT}),0) amount, COUNT(*) count
             FROM shop_subscriptions ss LEFT JOIN subscription_packages p ON p.id = ss.package_id
             WHERE ss.payment_status = 'paid' AND ${SUB_DATE} >= :start AND ${SUB_DATE} < :end GROUP BY bucket`),
      query(`SELECT s.id shop_id, ${shopOf('u')} shop, COUNT(DISTINCT o.id) orders,
               COALESCE(SUM(oi.items),0) items, COALESCE(SUM(o.total_amount),0) gross,
               COALESCE(SUM(o.platform_fee_amount),0) commission, COALESCE(SUM(o.escrow_amount),0) seller_share,
               COALESCE(SUM(CASE WHEN o.escrow_status='released' THEN o.escrow_amount END),0) released,
               COALESCE(SUM(CASE WHEN o.escrow_status='held' THEN o.escrow_amount END),0) held
             FROM orders o
             LEFT JOIN (SELECT order_id, SUM(quantity) items FROM order_items GROUP BY order_id) oi ON oi.order_id = o.id
             LEFT JOIN users u ON u.id = o.seller_id LEFT JOIN shops s ON s.id = u.shop_id
             WHERE ${PAID_ORDERS} GROUP BY s.id, shop ORDER BY gross DESC LIMIT ${ROW_CAP}`),
      query(`SELECT i.product_name product, ${shopOf('u')} shop, SUM(i.quantity) quantity, COALESCE(SUM(i.subtotal),0) revenue,
               COUNT(DISTINCT o.id) orders
             FROM order_items i JOIN orders o ON o.id = i.order_id
             LEFT JOIN users u ON u.id = o.seller_id LEFT JOIN shops s ON s.id = u.shop_id
             WHERE ${PAID_ORDERS} GROUP BY i.product_name, shop ORDER BY quantity DESC, revenue DESC LIMIT ${ROW_CAP}`),
      query(`SELECT o.id, o.order_number, ${shopOf('u')} shop, b.name buyer, o.total_amount, o.escrow_amount, o.platform_fee_amount commission,
               o.escrow_status, o.status, o.delivery_proof_status, o.paid_at, o.funds_released_at
             FROM orders o LEFT JOIN users u ON u.id = o.seller_id LEFT JOIN shops s ON s.id = u.shop_id LEFT JOIN users b ON b.id = o.user_id
             WHERE o.payment_status IN ('paid','refunded') AND ((o.paid_at >= :start AND o.paid_at < :end) OR (o.funds_released_at >= :start AND o.funds_released_at < :end))
             ORDER BY o.paid_at DESC LIMIT ${ROW_CAP}`),
      query(`SELECT COALESCE(SUM(CASE WHEN escrow_status='held' THEN escrow_amount END),0) held, COUNT(CASE WHEN escrow_status='held' THEN 1 END) held_orders,
               COUNT(CASE WHEN escrow_status='held' AND delivery_proof_status='pending_review' THEN 1 END) awaiting_approval
             FROM orders WHERE payment_status = 'paid'`),
      query(`SELECT COALESCE(SUM(CASE WHEN funds_released_at >= :start AND funds_released_at < :end THEN escrow_amount END),0) released,
               COUNT(CASE WHEN funds_released_at >= :start AND funds_released_at < :end THEN 1 END) released_orders,
               COALESCE(SUM(CASE WHEN escrow_status='refunded' AND updatedAt >= :start AND updatedAt < :end THEN escrow_amount END),0) refunded
             FROM orders`),
      query(`SELECT w.id, w.amount, w.currency, w.withdrawal_method method, w.account_name, w.account_number, w.admin_notes,
               w.processed_at, w.createdAt requested_at, u.name seller, ${shopOf('u')} shop
             FROM withdrawal_requests w LEFT JOIN users u ON u.id = w.user_id LEFT JOIN shops s ON s.id = u.shop_id
             WHERE w.status = 'completed' AND COALESCE(w.processed_at, w.updatedAt) >= :start AND COALESCE(w.processed_at, w.updatedAt) < :end
             ORDER BY COALESCE(w.processed_at, w.updatedAt) DESC LIMIT ${ROW_CAP}`),
      query(`SELECT w.id, w.amount, w.currency, w.status, w.withdrawal_method method, w.account_name, w.account_number, w.admin_notes,
               w.createdAt requested_at, w.processed_at, u.name seller, ${shopOf('u')} shop
             FROM withdrawal_requests w LEFT JOIN users u ON u.id = w.user_id LEFT JOIN shops s ON s.id = u.shop_id
             WHERE w.createdAt >= :start AND w.createdAt < :end ORDER BY w.createdAt DESC LIMIT ${ROW_CAP}`),
      query(`SELECT COALESCE(SUM(amount),0) amount, COUNT(*) count FROM withdrawal_requests WHERE status IN ('pending','processing')`),
      query(`SELECT ss.id, s.name shop, p.name package, p.billing_period, ${SUB_AMOUNT} amount, ss.status, ss.payment_reference,
               ss.current_period_start, ss.current_period_end
             FROM shop_subscriptions ss LEFT JOIN subscription_packages p ON p.id = ss.package_id LEFT JOIN shops s ON s.id = ss.shop_id
             WHERE ss.payment_status = 'paid' AND ${SUB_DATE} >= :start AND ${SUB_DATE} < :end ORDER BY ${SUB_DATE} DESC LIMIT ${ROW_CAP}`),
      query(`SELECT COUNT(CASE WHEN status IN ('active','trialing') THEN 1 END) active, COUNT(CASE WHEN status='past_due' THEN 1 END) past_due,
               COUNT(CASE WHEN status IN ('expired','canceled') THEN 1 END) ended FROM shop_subscriptions`),
      query(`SELECT COALESCE(p.name, 'Unknown package') package, COUNT(*) count, COALESCE(SUM(${SUB_AMOUNT}),0) amount
             FROM shop_subscriptions ss LEFT JOIN subscription_packages p ON p.id = ss.package_id
             WHERE ss.payment_status = 'paid' AND ${SUB_DATE} >= :start AND ${SUB_DATE} < :end GROUP BY package ORDER BY amount DESC`)
    ]);

    const subscriptionIncome = subsSeries.reduce((sum, row) => sum + num(row.amount), 0);
    const salesByBucket = new Map(salesSeries.map((row) => [row.bucket, row]));
    const subsByBucket = new Map(subsSeries.map((row) => [row.bucket, row]));
    const itemsByBucket = new Map(itemsSeries.map((row) => [row.bucket, row]));
    const series = bucketKeys(from, to, granularity).map((key) => ({
      bucket: key,
      orders: num(salesByBucket.get(key)?.orders),
      items: num(itemsByBucket.get(key)?.items),
      gross: num(salesByBucket.get(key)?.gross),
      commission: num(salesByBucket.get(key)?.commission),
      subscriptions: num(subsByBucket.get(key)?.amount)
    }));
    const requestStatus = { pending: 0, processing: 0, completed: 0, rejected: 0 };
    for (const row of requests) requestStatus[row.status] = (requestStatus[row.status] || 0) + 1;

    return res.json({
      success: true,
      data: {
        range: { from, to, granularity, timezone: TIMEZONE_LABEL, generated_at: new Date().toISOString() },
        basis: {
          sales: 'Paid, non-cancelled orders dated by payment time.',
          commission: 'Techaven commission recorded on each paid order.',
          subscriptions: 'Paid shop subscriptions dated by period start, at the amount paid (or package price).',
          escrow_now: 'Current balances, not limited to the selected dates.'
        },
        summary: {
          orders: num(sales.orders),
          items_sold: num(items.items),
          gross_sales: num(sales.gross),
          commission: num(sales.commission),
          seller_share: num(sales.seller_share),
          subscription_income: subscriptionIncome,
          platform_revenue: num(sales.commission) + subscriptionIncome,
          average_order: num(sales.orders) ? num(sales.gross) / num(sales.orders) : 0,
          buyers: num(sales.buyers),
          selling_shops: num(sales.sellers)
        },
        series,
        shops: toNumbers(shops, ['orders', 'items', 'gross', 'commission', 'seller_share', 'released', 'held']),
        products: toNumbers(products, ['quantity', 'revenue', 'orders']),
        escrow: {
          held_now: num(escrowNow.held),
          held_orders_now: num(escrowNow.held_orders),
          awaiting_approval_now: num(escrowNow.awaiting_approval),
          released: num(escrowPeriod.released),
          released_orders: num(escrowPeriod.released_orders),
          refunded: num(escrowPeriod.refunded),
          rows: toNumbers(escrowRows, ['total_amount', 'escrow_amount', 'commission'])
        },
        payouts: {
          total: payouts.reduce((sum, row) => sum + num(row.amount), 0),
          count: payouts.length,
          rows: toNumbers(payouts, ['amount'])
        },
        payout_requests: {
          count: requests.length,
          by_status: requestStatus,
          pending_now: { amount: num(pendingNow.amount), count: num(pendingNow.count) },
          rows: toNumbers(requests, ['amount'])
        },
        subscriptions: {
          income: subscriptionIncome,
          payments: subscriptions.length,
          active_now: num(subsNow.active),
          past_due_now: num(subsNow.past_due),
          ended: num(subsNow.ended),
          by_package: toNumbers(byPackage, ['count', 'amount']),
          rows: toNumbers(subscriptions, ['amount'])
        },
        truncated: [shops, products, escrowRows, payouts, requests, subscriptions].some((rows) => rows.length >= ROW_CAP)
      }
    });
  } catch (error) {
    console.error('Admin report error:', error);
    return res.status(500).json({ success: false, message: 'Could not build the report' });
  }
};
