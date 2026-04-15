import db from '../models/index.js';

const { User, UserShopPoints } = db;

/** shop_id 0 holds points not yet attributed to a specific shop (e.g. legacy balance). */
export const LEGACY_SHOP_ID = 0;

/**
 * Ensures sum(user_shop_points) === user.points by topping up the legacy bucket.
 * Call while holding a row lock on the user in a transaction when redeeming.
 */
export async function syncLegacyPointsBucket(userId, transaction) {
  const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!user) return null;
  const target = user.points || 0;
  const rows = await UserShopPoints.findAll({
    where: { user_id: userId },
    transaction,
    lock: transaction.LOCK.UPDATE
  });
  const sumRows = rows.reduce((acc, r) => acc + (r.points || 0), 0);
  if (sumRows >= target) return user;
  const diff = target - sumRows;
  const [legacy] = await UserShopPoints.findOrCreate({
    where: { user_id: userId, shop_id: LEGACY_SHOP_ID },
    defaults: { points: 0 },
    transaction
  });
  legacy.points = (legacy.points || 0) + diff;
  await legacy.save({ transaction });
  return user;
}
