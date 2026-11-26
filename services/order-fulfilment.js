import db from '../models/index.js';
import { cents, money } from './manual-payment-policy.js';
import { objectExists, publicUrlFor } from './storage/objectStore.js';
import { sendNotificationEmail } from '../utils/notificationHelper.js';

/**
 * Order fulfilment after payment:
 *   paid (escrow held) --seller dispatches--> shipped --buyer uploads proof--> delivered + proof pending_review
 *   --admin approves--> escrow released to the seller's wallet   (or --admin rejects--> shipped, buyer re-uploads)
 */
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const orderId = (value) => Number(String(value ?? '').replace(/^ord_/, ''));

/** Queues notifications to be emailed only after the transaction commits. */
async function notify(transaction, users, title, message, order, type = 'order') {
  const created = [];
  for (const userId of new Set(users.filter(Boolean))) {
    created.push(await db.Notification.create(
      { user_id: userId, title, message, type, order_id: order.id, read: false },
      { transaction }
    ));
  }
  transaction.afterCommit(() => {
    for (const notification of created) sendNotificationEmail(notification, order).catch?.(() => {});
  });
}

const adminIds = async (transaction) =>
  (await db.User.findAll({ where: { role: 'admin' }, attributes: ['id'], transaction })).map((user) => user.id);

const audit = (transaction, actorId, action, order, metadata = {}, ip = null) =>
  db.AuditLog.create({
    action, actor_user_id: actorId, target_type: 'order', target_id: String(order.id),
    metadata: { order_number: order.order_number, ...metadata }, ip_address: ip
  }, { transaction });

/** Seller marks a paid order as sent (delivery) or handed over at the shop (pickup). */
export async function dispatchOrder({ sellerId, id, trackingNumber, ip }) {
  return db.sequelize.transaction(async (transaction) => {
    const order = await db.Order.findOne({ where: { id: orderId(id), seller_id: sellerId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!order) throw fail('Order not found', 404);
    if (order.status === 'cancelled') throw fail('This order was cancelled', 409);
    if (order.payment_status !== 'paid' || order.escrow_status !== 'held') {
      throw fail('Wait until the buyer has paid before sending this order', 409);
    }
    if (order.dispatched_at || ['shipped', 'delivered'].includes(order.status)) return order;
    const tracking = trackingNumber == null ? '' : String(trackingNumber).trim();
    if (tracking.length > 120) throw fail('Tracking number is too long');
    const pickup = order.fulfilment_type === 'pickup';
    await order.update({
      status: 'shipped',
      dispatched_at: new Date(),
      seller_accepted_at: order.seller_accepted_at || new Date(),
      ...(tracking ? { courier_tracking_number: tracking } : {})
    }, { transaction });
    await audit(transaction, sellerId, pickup ? 'order.handed_over' : 'order.dispatched', order, { tracking_number: tracking || null }, ip);
    await notify(
      transaction,
      [order.user_id],
      pickup ? 'Order collected' : 'Order on its way',
      pickup
        ? `Your order ${order.order_number} was handed over at the shop. Upload a photo of what you received to confirm it.`
        : `Your order ${order.order_number} has been sent${order.courier_service ? ` with ${order.courier_service}` : ''}${tracking ? ` (tracking ${tracking})` : ''}. When it arrives, upload a photo of the parcel to confirm delivery.`,
      order
    );
    return order;
  });
}

const PROOF_KEY = (userId) => new RegExp(`^delivery-proofs/u${userId}/[0-9a-f-]{36}\\.(jpg|png|webp|pdf)$`);

/**
 * Buyer submits proof of delivery. Either `proofKey` (from POST /api/uploads/delivery-proof, which must
 * belong to the buyer) or a legacy `proofUrl` (mobile app). Funds stay in escrow until an admin approves.
 */
export async function submitDeliveryProof({ buyerId, id, proofKey, proofUrl, ip }) {
  if (proofKey) {
    if (!PROOF_KEY(buyerId).test(String(proofKey)) || !(await objectExists(String(proofKey), { visibility: 'private' }))) {
      throw fail('Upload the proof of delivery again');
    }
  } else if (!proofUrl) {
    throw fail('Upload a photo or PDF showing you received the parcel');
  }
  return db.sequelize.transaction(async (transaction) => {
    const order = await db.Order.findOne({ where: { id: orderId(id), user_id: buyerId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!order) throw fail('Order not found', 404);
    if (order.escrow_status !== 'held') throw fail('This order is not waiting for delivery confirmation', 409);
    if (order.delivery_proof_status === 'pending_review') throw fail('Your proof of delivery is already being reviewed', 409);
    if (order.delivery_proof_status === 'approved') throw fail('Delivery is already confirmed', 409);
    if (!['shipped', 'delivered'].includes(order.status)) {
      throw fail('The shop has not sent this order yet', 409);
    }
    await order.update({
      status: 'delivered',
      delivered_at: order.delivered_at || new Date(),
      delivery_proof_key: proofKey || null,
      delivery_confirmation_proof_url: proofKey ? publicUrlFor(String(proofKey)) : String(proofUrl).trim().slice(0, 2048),
      delivery_proof_status: 'pending_review',
      delivery_proof_submitted_at: new Date(),
      delivery_proof_rejection_reason: null
    }, { transaction });
    await audit(transaction, buyerId, 'order.delivery_proof.submitted', order, {}, ip);
    await notify(transaction, await adminIds(transaction), 'Delivery proof to review', `The buyer of ${order.order_number} uploaded proof of delivery. Approve it to release MWK ${order.escrow_amount} to the seller.`, order);
    await notify(transaction, [order.seller_id], 'Buyer confirmed delivery', `The buyer of ${order.order_number} uploaded proof of delivery. Techaven is reviewing it before releasing your payment.`, order);
    return order;
  });
}

/**
 * Moves the order's escrow from the holding (admin) wallet to the seller's wallet. Must run inside a
 * transaction; rows are locked and the release is recorded once, so retries cannot pay twice.
 */
export async function releaseEscrowToSeller(order, { actorId, reference }, transaction) {
  if (order.escrow_status !== 'held') throw fail(`Escrow is ${order.escrow_status || 'not held'}; nothing to release`, 409);
  if (!order.seller_id) throw fail('This order has no seller to pay', 409);
  const amount = cents(order.escrow_amount);
  const escrow = await db.Escrow.findOne({ where: { order_id: order.id }, transaction, lock: transaction.LOCK.UPDATE });
  if (escrow && escrow.status !== 'held') throw fail('Escrow was already settled; reconcile before approving', 409);

  // The holding account is the first administrator's wallet (see settleManualOrder).
  const holder = await db.User.findOne({ where: { role: 'admin' }, order: [['id', 'ASC']], transaction });
  if (!holder) throw fail('A holding-account administrator is required', 409);
  const holding = await db.Wallet.findOne({ where: { user_id: holder.id }, transaction, lock: transaction.LOCK.UPDATE });
  let sellerWallet = await db.Wallet.findOne({ where: { user_id: order.seller_id }, transaction, lock: transaction.LOCK.UPDATE });
  if (!sellerWallet) sellerWallet = await db.Wallet.create({ user_id: order.seller_id, balance: '0.00', currency: 'MWK' }, { transaction });

  const now = new Date();
  if (holding) {
    const holdingBalance = money(cents(holding.balance) - amount);
    await holding.update({ balance: holdingBalance }, { transaction });
    await db.WalletTransaction.create({
      wallet_id: holding.id, user_id: holder.id, type: 'debit', amount: money(amount), currency: 'MWK',
      description: `Escrow release for ${order.order_number} to seller`, reference: `escrow_release_${order.id}`,
      status: 'completed', balance_after: holdingBalance
    }, { transaction });
  }
  const sellerBalance = money(cents(sellerWallet.balance) + amount);
  await sellerWallet.update({ balance: sellerBalance }, { transaction });
  const pending = await db.WalletTransaction.findOne({
    where: { user_id: order.seller_id, reference: `order_${order.id}`, status: ['pending', 'processing'] },
    transaction, lock: transaction.LOCK.UPDATE
  });
  if (pending) {
    await pending.update({ status: 'completed', wallet_id: sellerWallet.id, balance_after: sellerBalance, description: `Payment received for ${order.order_number}` }, { transaction });
  } else {
    await db.WalletTransaction.create({
      wallet_id: sellerWallet.id, user_id: order.seller_id, type: 'credit', amount: money(amount), currency: 'MWK',
      description: `Payment received for ${order.order_number}`, reference: reference || `order_payment_${order.id}`,
      status: 'completed', balance_after: sellerBalance
    }, { transaction });
  }
  if (escrow) await escrow.update({ status: 'released', released_at: now }, { transaction });
  await order.update({ escrow_status: 'released', funds_released_at: now, delivery_confirmed_at: order.delivery_confirmed_at || now }, { transaction });
  await audit(transaction, actorId, 'order.escrow.released', order, { amount: money(amount), seller_id: order.seller_id });
  return { amount: money(amount), seller_balance: sellerBalance };
}

/** Admin approves the buyer's proof: escrow moves to the seller's wallet in the same transaction. */
export async function approveDeliveryProof({ adminId, id, ip }) {
  return db.sequelize.transaction(async (transaction) => {
    const order = await db.Order.findByPk(orderId(id), { transaction, lock: transaction.LOCK.UPDATE });
    if (!order) throw fail('Order not found', 404);
    if (order.delivery_proof_status === 'approved' && order.escrow_status === 'released') return { order, released: null };
    if (order.delivery_proof_status !== 'pending_review') throw fail('There is no proof of delivery waiting for review', 409);
    const released = await releaseEscrowToSeller(order, { actorId: adminId, reference: `delivery_approved_${order.id}` }, transaction);
    await order.update({ delivery_proof_status: 'approved', delivery_proof_reviewed_at: new Date(), delivery_proof_reviewed_by: adminId }, { transaction });
    await audit(transaction, adminId, 'order.delivery_proof.approved', order, {}, ip);
    await notify(transaction, [order.seller_id], 'Payment released', `MWK ${released.amount} for ${order.order_number} is now in your wallet.`, order, 'payment');
    await notify(transaction, [order.user_id], 'Delivery confirmed', `Thanks for confirming ${order.order_number}. Your order is complete.`, order);
    return { order, released };
  });
}

/** Admin rejects the proof; the order goes back to "shipped" so the buyer can upload again. */
export async function rejectDeliveryProof({ adminId, id, reason, ip }) {
  const text = String(reason || '').trim();
  if (!text || text.length > 1000) throw fail('A reason is required (maximum 1000 characters)');
  return db.sequelize.transaction(async (transaction) => {
    const order = await db.Order.findByPk(orderId(id), { transaction, lock: transaction.LOCK.UPDATE });
    if (!order) throw fail('Order not found', 404);
    if (order.delivery_proof_status !== 'pending_review') throw fail('There is no proof of delivery waiting for review', 409);
    await order.update({
      status: 'shipped',
      delivery_proof_status: 'rejected',
      delivery_proof_reviewed_at: new Date(),
      delivery_proof_reviewed_by: adminId,
      delivery_proof_rejection_reason: text
    }, { transaction });
    await audit(transaction, adminId, 'order.delivery_proof.rejected', order, { reason: text }, ip);
    await notify(transaction, [order.user_id], 'Proof of delivery needs attention', `We couldn't accept the proof for ${order.order_number}: ${text}. Please upload a clearer photo.`, order);
    return order;
  });
}

/** Fields the buyer, seller and admin apps read to show fulfilment progress. */
export const fulfilmentFields = (order) => ({
  fulfilment_type: order.fulfilment_type || 'delivery',
  courier_service: order.courier_service || null,
  courier_tracking_number: order.courier_tracking_number || null,
  dispatched_at: order.dispatched_at || null,
  delivered_at: order.delivered_at || null,
  delivery_proof_status: order.delivery_proof_status || null,
  delivery_proof_submitted_at: order.delivery_proof_submitted_at || null,
  delivery_proof_rejection_reason: order.delivery_proof_rejection_reason || null,
  funds_released_at: order.funds_released_at || null
});
