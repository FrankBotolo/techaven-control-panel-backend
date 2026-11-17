import { Op } from 'sequelize';
import db from '../models/index.js';
import { sendManualCheckoutEmail } from './emailService.js';
import { enqueueDevice } from './catalogue/promotionSync.js';

const { sequelize, Order, OrderItem, SellerListing, DeviceVariant } = db;
const query = (sql, replacements = {}, transaction) => sequelize.query(sql, { replacements, transaction });

export function proofUrl(reference) {
  const base = process.env.FRONTEND_URL;
  if (!base) return null;
  try {
    const url = new URL('/orders/' + encodeURIComponent(reference), base);
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    url.hash = 'payment-proof';
    return url.href;
  } catch {
    return null;
  }
}

export async function manualNotice(group, transaction) {
  if (!group) return null;
  const [rows] = await query('SELECT *, UNIX_TIMESTAMP(deadline) * 1000 AS deadline_ms FROM manual_checkout_notices WHERE checkout_group_id = :group', { group }, transaction);
  return rows[0] ?? null;
}

export async function queueManualCheckout(orders, email, summary, transaction) {
  const first = orders[0];
  await query(`INSERT INTO manual_checkout_notices
    (checkout_group_id, order_id, deadline, email, summary, next_attempt)
    SELECT :group, id, DATE_ADD(createdAt, INTERVAL 12 HOUR), :email, :summary, NOW(3) FROM orders WHERE id = :orderId`, {
    group: first.checkout_group_id, orderId: first.id, email: email || null, summary,
  }, transaction);
}

export async function expireManualCheckout(group, now = new Date()) {
  await sequelize.transaction(async transaction => {
    const orders = await Order.findAll({ where: { checkout_group_id: group }, order: [['id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE });
    const notice = await manualNotice(group, transaction);
    if (!notice || Number(notice.deadline_ms) > now.getTime()) return;
    const pending = orders.filter(order => order.status === 'pending' && order.payment_status === 'pending');
    if (!pending.length) return;
    const submissionIds = [...new Set(pending.map(order => order.manual_payment_submission_id).filter(Boolean))];
    if (submissionIds.length) {
      const [proofs] = await query("SELECT id FROM payment_submissions WHERE id IN (:ids) AND status IN ('pending_review','approved') AND createdAt <= FROM_UNIXTIME(:deadline)", { ids: submissionIds, deadline: Number(notice.deadline_ms) / 1000 }, transaction);
      if (proofs.length) return;
    }
    const items = await OrderItem.findAll({
      where: { order_id: pending.map(order => order.id), seller_listing_id: { [Op.ne]: null } },
      order: [['seller_listing_id', 'ASC']], transaction,
    });
    for (const item of items) {
      const listing = await SellerListing.findByPk(item.seller_listing_id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!listing) throw new Error('Reserved listing is missing');
      await listing.increment('quantity', { by: item.quantity, transaction });
      const variant = await DeviceVariant.findByPk(listing.device_variant_id, { transaction });
      if (variant) await enqueueDevice(variant.device_id, { transaction, reason: `manual-expiry:${item.id}` });
    }
    await Order.update({ status: 'cancelled', payment_status: 'failed' }, { where: { id: pending.map(order => order.id) }, transaction });
  });
}

export async function processManualCheckoutNotices({ deliver = sendManualCheckoutEmail } = {}) {
  const [due] = await query(`SELECT n.checkout_group_id FROM manual_checkout_notices n
    JOIN orders o ON o.id = n.order_id
    WHERE n.deadline <= NOW(3) AND o.status = 'pending' AND o.payment_status = 'pending'
    AND NOT EXISTS (SELECT 1 FROM payment_submissions p WHERE p.id = o.manual_payment_submission_id
      AND p.status IN ('pending_review','approved') AND p.createdAt <= n.deadline)
    ORDER BY n.deadline LIMIT 50`);
  for (const row of due) await expireManualCheckout(row.checkout_group_id);
  const [mail] = await query(`SELECT n.*, UNIX_TIMESTAMP(n.deadline) * 1000 AS deadline_ms FROM manual_checkout_notices n
    JOIN orders o ON o.id = n.order_id
    WHERE n.email IS NOT NULL AND n.sent_at IS NULL AND n.next_attempt <= NOW(3) AND n.deadline > NOW(3)
      AND o.status = 'pending' AND o.payment_status = 'pending' ORDER BY n.next_attempt LIMIT 20`);
  for (const row of mail) {
    const [, count] = await query(`UPDATE manual_checkout_notices SET attempts = attempts + 1,
      next_attempt = DATE_ADD(NOW(3), INTERVAL 5 MINUTE)
      WHERE checkout_group_id = :group AND sent_at IS NULL AND next_attempt <= NOW(3)`, { group: row.checkout_group_id });
    if (!(typeof count === 'number' ? count : count?.affectedRows)) continue;
    try {
      const order = await Order.findByPk(row.order_id);
      if (order?.status !== "pending" || order.payment_status !== "pending") continue;
      const url = proofUrl(order.order_number);
      if (!url) throw new Error('FRONTEND_URL is required');
      await deliver(row.email, { reference: order.order_number, deadline: Number(row.deadline_ms), url, summary: row.summary });
      await query('UPDATE manual_checkout_notices SET sent_at = NOW(3) WHERE checkout_group_id = :group', { group: row.checkout_group_id });
    } catch (error) {
      console.error('Manual checkout notification deferred:', error.code || error.name);
    }
  }
}

export function startManualCheckoutWorker() {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try { await processManualCheckoutNotices(); }
    catch (error) { console.error('Manual checkout worker:', error.code || error.name); }
    finally { running = false; }
  }, 30000);
  timer.unref();
}
