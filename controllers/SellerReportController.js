import db from '../models/index.js';
import { TIMEZONE_LABEL, bucket, bucketKeys, local, num, parsePeriod, toNumbers } from '../utils/reportPeriods.js';

/**
 * GET /api/sellers/reports?from=YYYY-MM-DD&to=YYYY-MM-DD&granularity=day|week|month
 *
 * The signed-in seller's own sales report. Every query is scoped to orders.seller_id = the seller
 * (and their own wallet, withdrawals and shop plan), so one seller can never see another's figures.
 */
const ROW_CAP = 5000;
const PAID = "o.seller_id = :seller AND o.payment_status = 'paid' AND o.status <> 'cancelled' AND o.paid_at >= :start AND o.paid_at < :end";
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const getSellerReport = async (req, res) => {
  try {
    const period = parsePeriod(req.query);
    if (period.error) return res.status(400).json({ success: false, message: period.error });
    const { from, to, granularity } = period;
    const replacements = { ...period.replacements, seller: req.user.id, shop: req.user.shop_id || 0 };
    const query = async (sql) => db.sequelize.query(sql, { replacements, type: db.sequelize.QueryTypes.SELECT });

    const [
      [sales], [items], salesSeries, itemsSeries, products, orders,
      [now], [released], [lost], [speed], fulfilment, couriers, weekdays,
      [wallet], withdrawals, [pendingWithdrawals], [plan]
    ] = await Promise.all([
      query(`SELECT COUNT(*) orders, COALESCE(SUM(o.total_amount),0) gross, COALESCE(SUM(o.platform_fee_amount),0) commission,
               COALESCE(SUM(o.escrow_amount),0) net, COUNT(DISTINCT o.user_id) buyers
             FROM orders o WHERE ${PAID}`),
      query(`SELECT COALESCE(SUM(i.quantity),0) items, COUNT(DISTINCT i.product_name) products
             FROM order_items i JOIN orders o ON o.id = i.order_id WHERE ${PAID}`),
      query(`SELECT ${bucket('o.paid_at', granularity)} bucket, COUNT(*) orders, COALESCE(SUM(o.total_amount),0) gross,
               COALESCE(SUM(o.escrow_amount),0) net, COALESCE(SUM(o.platform_fee_amount),0) commission
             FROM orders o WHERE ${PAID} GROUP BY bucket`),
      query(`SELECT ${bucket('o.paid_at', granularity)} bucket, COALESCE(SUM(i.quantity),0) items
             FROM order_items i JOIN orders o ON o.id = i.order_id WHERE ${PAID} GROUP BY bucket`),
      query(`SELECT i.product_name product, SUM(i.quantity) quantity, COALESCE(SUM(i.subtotal),0) revenue, COUNT(DISTINCT o.id) orders,
               MAX(o.paid_at) last_sold
             FROM order_items i JOIN orders o ON o.id = i.order_id WHERE ${PAID}
             GROUP BY i.product_name ORDER BY quantity DESC, revenue DESC LIMIT ${ROW_CAP}`),
      query(`SELECT o.id, o.order_number, b.name buyer, o.createdAt placed_at, o.paid_at, o.total_amount, o.platform_fee_amount commission,
               o.escrow_amount net, o.status, o.payment_status, o.escrow_status, o.fulfilment_type, o.courier_service,
               o.dispatched_at, o.delivery_proof_status, o.funds_released_at,
               (SELECT COALESCE(SUM(quantity),0) FROM order_items WHERE order_id = o.id) items
             FROM orders o LEFT JOIN users b ON b.id = o.user_id
             WHERE o.seller_id = :seller AND ((o.paid_at >= :start AND o.paid_at < :end) OR (o.paid_at IS NULL AND o.createdAt >= :start AND o.createdAt < :end))
             ORDER BY COALESCE(o.paid_at, o.createdAt) DESC LIMIT ${ROW_CAP}`),
      // Current position, not limited to the selected dates.
      query(`SELECT
               COALESCE(SUM(CASE WHEN escrow_status='held' THEN escrow_amount END),0) in_escrow,
               COUNT(CASE WHEN escrow_status='held' AND dispatched_at IS NULL AND status NOT IN ('shipped','delivered','cancelled') THEN 1 END) to_send,
               COUNT(CASE WHEN escrow_status='held' AND (dispatched_at IS NOT NULL OR status IN ('shipped','delivered'))
                           AND (delivery_proof_status IS NULL OR delivery_proof_status='rejected') THEN 1 END) awaiting_buyer,
               COUNT(CASE WHEN escrow_status='held' AND delivery_proof_status='pending_review' THEN 1 END) awaiting_approval,
               COALESCE(SUM(CASE WHEN escrow_status='held' AND delivery_proof_status='pending_review' THEN escrow_amount END),0) approval_amount
             FROM orders WHERE seller_id = :seller AND payment_status = 'paid'`),
      query(`SELECT COALESCE(SUM(escrow_amount),0) amount, COUNT(*) orders FROM orders
             WHERE seller_id = :seller AND funds_released_at >= :start AND funds_released_at < :end`),
      query(`SELECT COUNT(CASE WHEN status='cancelled' THEN 1 END) cancelled, COALESCE(SUM(CASE WHEN status='cancelled' THEN total_amount END),0) cancelled_value,
               COUNT(CASE WHEN payment_status='pending' AND status<>'cancelled' THEN 1 END) unpaid,
               COALESCE(SUM(CASE WHEN payment_status='pending' AND status<>'cancelled' THEN total_amount END),0) unpaid_value
             FROM orders WHERE seller_id = :seller AND createdAt >= :start AND createdAt < :end`),
      query(`SELECT COUNT(*) sent, AVG(TIMESTAMPDIFF(MINUTE, o.paid_at, o.dispatched_at)) / 60 avg_hours,
               COUNT(CASE WHEN TIMESTAMPDIFF(MINUTE, o.paid_at, o.dispatched_at) <= 1440 THEN 1 END) within_day
             FROM orders o WHERE ${PAID} AND o.dispatched_at IS NOT NULL AND o.dispatched_at >= o.paid_at`),
      query(`SELECT COALESCE(o.fulfilment_type,'delivery') type, COUNT(*) orders, COALESCE(SUM(o.total_amount),0) gross
             FROM orders o WHERE ${PAID} GROUP BY type`),
      query(`SELECT COALESCE(o.courier_service, 'Techaven rider') courier, COUNT(*) orders
             FROM orders o WHERE ${PAID} AND COALESCE(o.fulfilment_type,'delivery') = 'delivery' GROUP BY courier ORDER BY orders DESC`),
      query(`SELECT WEEKDAY(${local('o.paid_at')}) weekday, COUNT(*) orders, COALESCE(SUM(o.total_amount),0) gross
             FROM orders o WHERE ${PAID} GROUP BY weekday`),
      query(`SELECT COALESCE(balance,0) balance FROM wallets WHERE user_id = :seller LIMIT 1`),
      query(`SELECT id, amount, status, withdrawal_method method, account_name, account_number, admin_notes, createdAt requested_at, processed_at
             FROM withdrawal_requests WHERE user_id = :seller AND createdAt >= :start AND createdAt < :end ORDER BY createdAt DESC LIMIT ${ROW_CAP}`),
      query(`SELECT COALESCE(SUM(amount),0) amount, COUNT(*) count FROM withdrawal_requests WHERE user_id = :seller AND status IN ('pending','processing')`),
      query(`SELECT p.name package, p.price_mwk price, p.billing_period, ss.status, ss.current_period_end
             FROM shop_subscriptions ss LEFT JOIN subscription_packages p ON p.id = ss.package_id
             WHERE ss.shop_id = :shop ORDER BY (ss.status IN ('active','trialing')) DESC, ss.current_period_end DESC LIMIT 1`)
    ]);

    const salesBy = new Map(salesSeries.map((row) => [row.bucket, row]));
    const itemsBy = new Map(itemsSeries.map((row) => [row.bucket, row]));
    const series = bucketKeys(from, to, granularity).map((key) => ({
      bucket: key,
      orders: num(salesBy.get(key)?.orders),
      items: num(itemsBy.get(key)?.items),
      gross: num(salesBy.get(key)?.gross),
      net: num(salesBy.get(key)?.net),
      commission: num(salesBy.get(key)?.commission)
    }));
    const byWeekday = WEEKDAYS.map((day, index) => {
      const row = weekdays.find((item) => num(item.weekday) === index);
      return { day, orders: num(row?.orders), gross: num(row?.gross) };
    });
    const best = byWeekday.reduce((top, day) => (day.gross > top.gross ? day : top), byWeekday[0]);
    const bestPeriod = series.reduce((top, row) => (row.gross > (top?.gross ?? 0) ? row : top), null);
    const withdrawalStatus = { pending: 0, processing: 0, completed: 0, rejected: 0 };
    for (const row of withdrawals) withdrawalStatus[row.status] = (withdrawalStatus[row.status] || 0) + 1;
    const sent = num(speed.sent);

    return res.json({
      success: true,
      data: {
        range: { from, to, granularity, timezone: TIMEZONE_LABEL, generated_at: new Date().toISOString() },
        basis: {
          sales: 'Paid, non-cancelled orders dated by payment time.',
          net: 'Your earnings after Techaven commission; paid to your wallet once delivery is approved.',
          now: 'Escrow, wallet and action counts are current, not limited to the selected dates.'
        },
        summary: {
          orders: num(sales.orders),
          items_sold: num(items.items),
          products_sold: num(items.products),
          gross_sales: num(sales.gross),
          commission: num(sales.commission),
          net_earnings: num(sales.net),
          average_order: num(sales.orders) ? num(sales.gross) / num(sales.orders) : 0,
          buyers: num(sales.buyers),
          released: num(released.amount),
          released_orders: num(released.orders),
          cancelled: num(lost.cancelled),
          cancelled_value: num(lost.cancelled_value),
          unpaid: num(lost.unpaid),
          unpaid_value: num(lost.unpaid_value),
          best_weekday: best.gross > 0 ? best.day : null,
          best_period: bestPeriod?.gross ? { bucket: bestPeriod.bucket, gross: bestPeriod.gross } : null
        },
        now: {
          in_escrow: num(now.in_escrow),
          to_send: num(now.to_send),
          awaiting_buyer: num(now.awaiting_buyer),
          awaiting_approval: num(now.awaiting_approval),
          approval_amount: num(now.approval_amount),
          wallet_balance: num(wallet?.balance),
          pending_withdrawals: { amount: num(pendingWithdrawals.amount), count: num(pendingWithdrawals.count) }
        },
        series,
        products: toNumbers(products, ['quantity', 'revenue', 'orders']),
        orders: toNumbers(orders, ['total_amount', 'commission', 'net', 'items']),
        fulfilment: {
          sent,
          average_hours_to_send: speed.avg_hours == null ? null : Math.round(num(speed.avg_hours) * 10) / 10,
          sent_within_a_day: sent ? Math.round((num(speed.within_day) / sent) * 100) : null,
          by_type: toNumbers(fulfilment, ['orders', 'gross']),
          couriers: toNumbers(couriers, ['orders']),
          by_weekday: byWeekday
        },
        withdrawals: {
          by_status: withdrawalStatus,
          completed_total: withdrawals.filter((row) => row.status === 'completed').reduce((sum, row) => sum + num(row.amount), 0),
          rows: toNumbers(withdrawals, ['amount'])
        },
        plan: plan ? { ...plan, price: num(plan.price) } : null,
        truncated: [products, orders, withdrawals].some((rows) => rows.length >= ROW_CAP)
      }
    });
  } catch (error) {
    console.error('Seller report error:', error);
    return res.status(500).json({ success: false, message: 'Could not build your report' });
  }
};
