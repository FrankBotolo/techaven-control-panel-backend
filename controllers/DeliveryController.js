import db from '../models/index.js';
import {
  approveDeliveryProof,
  dispatchOrder,
  fulfilmentFields,
  rejectDeliveryProof,
  submitDeliveryProof
} from '../services/order-fulfilment.js';
import { readObject } from '../services/storage/objectStore.js';
import { awardPointsForOrder } from './OrderController.js';

const { Order, User } = db;

const send = (res, error, fallback) => {
  if (!error.status) console.error(`${fallback}:`, error);
  return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : fallback });
};

/** POST /api/sellers/orders/:order_id/dispatch { tracking_number? } */
export const dispatch = async (req, res) => {
  try {
    const order = await dispatchOrder({ sellerId: req.user.id, id: req.params.order_id, trackingNumber: req.body?.tracking_number, ip: req.ip });
    return res.json({
      success: true,
      message: order.fulfilment_type === 'pickup' ? 'Marked as handed over at the shop' : 'Marked as sent',
      data: { id: order.id, order_number: order.order_number, status: order.status, ...fulfilmentFields(order) }
    });
  } catch (error) { return send(res, error, 'Could not update the order'); }
};

/** POST /api/orders/:order_id/delivery/proof { proof_key } — buyer, after receiving the parcel. */
export const submitProof = async (req, res) => {
  try {
    const order = await submitDeliveryProof({ buyerId: req.user.id, id: req.params.order_id, proofKey: req.body?.proof_key, ip: req.ip });
    return res.status(201).json({
      success: true,
      message: 'Proof of delivery submitted. Techaven will review it and release payment to the shop.',
      data: { id: order.id, order_number: order.order_number, status: order.status, escrow_status: order.escrow_status, ...fulfilmentFields(order) }
    });
  } catch (error) { return send(res, error, 'Could not submit proof of delivery'); }
};

/** GET /api/orders/:order_id/delivery/proof — streams the private proof to the buyer, the seller or an admin. */
export const proofFile = async (req, res) => {
  try {
    const order = await Order.findByPk(Number(String(req.params.order_id).replace(/^ord_/, '')));
    const allowed = order && (req.user.role === 'admin' || order.user_id === req.user.id || order.seller_id === req.user.id);
    if (!allowed || !order.delivery_proof_key) return res.status(404).json({ success: false, message: 'Proof not found' });
    const extension = order.delivery_proof_key.split('.').pop();
    const type = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' }[extension] || 'application/octet-stream';
    const buffer = await readObject(order.delivery_proof_key, { visibility: 'private' });
    res.set({ 'Cache-Control': 'private, no-store', 'Content-Type': type, 'X-Content-Type-Options': 'nosniff' });
    return res.send(buffer);
  } catch (error) { return send(res, error, 'Could not load the proof'); }
};

/** GET /api/admin/delivery-proofs?status=pending_review|approved|rejected&page= */
export const listProofs = async (req, res) => {
  try {
    const status = ['pending_review', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending_review';
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = 30;
    const { rows, count } = await Order.findAndCountAll({
      where: { delivery_proof_status: status },
      attributes: ['id', 'order_number', 'status', 'total_amount', 'escrow_amount', 'escrow_status', 'shipping_address', 'shipping_phone',
        'fulfilment_type', 'courier_service', 'courier_tracking_number', 'dispatched_at', 'delivered_at', 'delivery_proof_key', 'delivery_confirmation_proof_url',
        'delivery_proof_status', 'delivery_proof_submitted_at', 'delivery_proof_reviewed_at', 'delivery_proof_rejection_reason',
        'funds_released_at', 'createdAt'],
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'phone_number'] },
        { model: User, as: 'seller', attributes: ['id', 'name'], include: [{ model: db.Shop, as: 'shop', attributes: ['id', 'name'], required: false }], required: false },
        { model: db.OrderItem, as: 'items', attributes: ['id', 'product_name', 'quantity', 'subtotal'] }
      ],
      order: [['delivery_proof_submitted_at', status === 'pending_review' ? 'ASC' : 'DESC']],
      limit,
      offset: (page - 1) * limit,
      distinct: true
    });
    return res.json({
      success: true,
      data: {
        orders: rows.map((row) => {
          const { delivery_proof_key: key, ...plain } = row.get({ plain: true });
          return { ...plain, has_proof_file: Boolean(key), shop_name: plain.seller?.shop?.name || plain.seller?.name || null };
        }),
        total: count,
        page
      }
    });
  } catch (error) { return send(res, error, 'Could not load deliveries'); }
};

/** POST /api/admin/orders/:id/delivery/approve — releases escrow to the seller's wallet. */
export const approve = async (req, res) => {
  try {
    const { order, released } = await approveDeliveryProof({ adminId: req.user.id, id: req.params.id, ip: req.ip });
    // Loyalty points follow a completed order; a failure here must not undo the payout.
    if (released) await awardPointsForOrder(order.id, order.user_id).catch((error) => console.error('Award points error:', error));
    return res.json({
      success: true,
      message: released ? `Released MWK ${released.amount} to the seller` : 'Already approved',
      data: { id: order.id, escrow_status: order.escrow_status, ...fulfilmentFields(order) }
    });
  } catch (error) { return send(res, error, 'Could not approve delivery'); }
};

/** POST /api/admin/orders/:id/delivery/reject { reason } */
export const reject = async (req, res) => {
  try {
    const order = await rejectDeliveryProof({ adminId: req.user.id, id: req.params.id, reason: req.body?.reason, ip: req.ip });
    return res.json({ success: true, message: 'Proof rejected; the buyer can upload again', data: { id: order.id, ...fulfilmentFields(order) } });
  } catch (error) { return send(res, error, 'Could not reject the proof'); }
};
