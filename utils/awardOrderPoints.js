import db from '../models/index.js';

const { Order, OrderItem, Product, User, UserShopPoints } = db;

/**
 * Credit loyalty points from product.points × quantity (per shop) when an order is paid.
 * Idempotent: uses orders.purchase_points_awarded_at (run migration if missing).
 */
export async function awardPurchasePointsForPaidOrder(orderId, userId) {
  const order = await Order.findOne({
    where: {
      id: orderId,
      user_id: userId,
      payment_status: 'paid',
      purchase_points_awarded_at: null
    }
  });
  if (!order) {
    return { awarded: false, totalPoints: 0 };
  }

  const items = await OrderItem.findAll({
    where: { order_id: orderId },
    include: [{ model: Product, as: 'product', attributes: ['id', 'points', 'shop_id'] }]
  });
  const byShop = new Map();
  for (const item of items) {
    const sid = item.product?.shop_id;
    if (sid == null || sid === undefined) continue;
    const pts = (item.product?.points || 0) * (item.quantity || 1);
    if (pts <= 0) continue;
    byShop.set(sid, (byShop.get(sid) || 0) + pts);
  }

  let totalPoints = 0;
  for (const [shopId, pts] of byShop) {
    totalPoints += pts;
    const [row] = await UserShopPoints.findOrCreate({
      where: { user_id: userId, shop_id: shopId },
      defaults: { points: 0 }
    });
    row.points = (row.points || 0) + pts;
    await row.save();
  }

  if (totalPoints > 0) {
    const buyer = await User.findByPk(userId);
    if (buyer) {
      buyer.points = (buyer.points || 0) + totalPoints;
      await buyer.save();
    }
  }

  order.purchase_points_awarded_at = new Date();
  await order.save({ fields: ['purchase_points_awarded_at'] });

  return { awarded: true, totalPoints };
}
