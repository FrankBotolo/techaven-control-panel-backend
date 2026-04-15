import { Op } from 'sequelize';
import db from '../models/index.js';
import { logAudit, auditContext } from '../utils/audit.js';
import { syncLegacyPointsBucket, LEGACY_SHOP_ID } from '../utils/pointsBalance.js';

const { User, UserShopPoints, Shop, Wallet, WalletTransaction, PlatformSetting, sequelize } = db;

async function getPlatformDefaultRate(transaction = undefined) {
  const row = await PlatformSetting.findOne({
    order: [['id', 'ASC']],
    transaction
  });
  if (!row || row.default_points_mwk_per_point == null) return null;
  const r = parseFloat(row.default_points_mwk_per_point);
  if (Number.isNaN(r) || r <= 0) return null;
  return r;
}

export const getPointBalances = async (req, res) => {
  try {
    const userId = req.user.id;
    const transaction = await sequelize.transaction();
    try {
      await syncLegacyPointsBucket(userId, transaction);
      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }

    const user = await User.findByPk(userId);
    const rows = await UserShopPoints.findAll({
      where: { user_id: userId, points: { [Op.gt]: 0 } },
      order: [['shop_id', 'ASC']]
    });
    const platformRate = await getPlatformDefaultRate();
    const balances = [];
    for (const r of rows) {
      let mwkPerPoint = null;
      let shopName = null;
      if (r.shop_id === LEGACY_SHOP_ID) {
        mwkPerPoint = platformRate;
        shopName = 'General';
      } else {
        const shop = await Shop.findByPk(r.shop_id, {
          attributes: ['id', 'name', 'points_mwk_per_point']
        });
        shopName = shop?.name || null;
        const sr = shop ? parseFloat(shop.points_mwk_per_point) : NaN;
        mwkPerPoint = !Number.isNaN(sr) && sr > 0 ? sr : null;
      }
      balances.push({
        shop_id: r.shop_id,
        shop_name: shopName,
        points: r.points,
        points_mwk_per_point: mwkPerPoint,
        redeemable_mwk_estimate:
          mwkPerPoint != null ? Math.round(r.points * mwkPerPoint * 100) / 100 : null
      });
    }

    return res.json({
      success: true,
      message: 'Point balances retrieved',
      data: {
        total_points: user.points || 0,
        currency: 'MWK',
        balances
      }
    });
  } catch (error) {
    console.error('Get point balances error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve point balances',
      data: null,
      error: error.message
    });
  }
};

export const redeemPoints = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shop_id, points: pointsRaw } = req.body;
    const shopId = parseInt(shop_id, 10);
    const redeemPts = parseInt(pointsRaw, 10);
    if (shop_id === undefined || shop_id === null || Number.isNaN(shopId) || shopId < 0) {
      return res.status(400).json({
        success: false,
        message: 'shop_id is required (non-negative integer; use 0 for the general / legacy bucket)',
        data: null
      });
    }
    if (!Number.isFinite(redeemPts) || redeemPts < 1) {
      return res.status(400).json({
        success: false,
        message: 'points must be a positive integer',
        data: null
      });
    }

    const transaction = await sequelize.transaction();
    try {
      await syncLegacyPointsBucket(userId, transaction);
      const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
      const bucket = await UserShopPoints.findOne({
        where: { user_id: userId, shop_id: shopId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      const available = bucket?.points || 0;
      if (available < redeemPts) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Insufficient points for this shop bucket',
          data: { shop_id: shopId, available_points: available }
        });
      }

      let rate = null;
      if (shopId === LEGACY_SHOP_ID) {
        rate = await getPlatformDefaultRate(transaction);
        if (rate == null) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message:
              'Point redemption is not enabled for the general balance. An admin must set default_points_mwk_per_point in platform settings.',
            data: null
          });
        }
      } else {
        const shop = await Shop.findByPk(shopId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!shop) {
          await transaction.rollback();
          return res.status(404).json({
            success: false,
            message: 'Shop not found',
            data: null
          });
        }
        rate = parseFloat(shop.points_mwk_per_point);
        if (Number.isNaN(rate) || rate <= 0) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'This shop has not enabled point redemption (points_mwk_per_point not set)',
            data: null
          });
        }
      }

      const mwk = Math.round(redeemPts * rate * 100) / 100;
      if (mwk <= 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Redemption amount is too small',
          data: null
        });
      }

      bucket.points = available - redeemPts;
      await bucket.save({ transaction });
      user.points = Math.max(0, (user.points || 0) - redeemPts);
      await user.save({ transaction });

      let wallet = await Wallet.findOne({ where: { user_id: userId }, transaction });
      if (!wallet) {
        wallet = await Wallet.create(
          { user_id: userId, balance: 0, currency: 'MWK' },
          { transaction }
        );
      }
      const newBal = Math.round((parseFloat(wallet.balance) + mwk) * 100) / 100;
      wallet.balance = newBal;
      await wallet.save({ transaction });

      await WalletTransaction.create(
        {
          wallet_id: wallet.id,
          user_id: userId,
          type: 'credit',
          amount: mwk,
          currency: 'MWK',
          description:
            shopId === LEGACY_SHOP_ID
              ? `Redeemed ${redeemPts} loyalty points (general) → MWK ${mwk}`
              : `Redeemed ${redeemPts} loyalty points (shop #${shopId}) → MWK ${mwk}`,
          reference: `points_redeem_${userId}_${Date.now()}`,
          status: 'completed',
          balance_after: newBal
        },
        { transaction }
      );

      await transaction.commit();

      await logAudit({
        ...auditContext(req),
        action: 'user.points.redeem',
        actor_user_id: userId,
        target_type: 'user',
        target_id: userId,
        metadata: { shop_id: shopId, points: redeemPts, mwk_credited: mwk, rate }
      });

      return res.json({
        success: true,
        message: 'Points redeemed to wallet',
        data: {
          points_redeemed: redeemPts,
          mwk_credited: mwk,
          currency: 'MWK',
          wallet_balance: newBal,
          remaining_points: user.points
        }
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error('Redeem points error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to redeem points',
      data: null,
      error: error.message
    });
  }
};
