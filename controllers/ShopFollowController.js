import db from '../models/index.js';

const { Shop, ShopFollow } = db;

function assertCanFollowShop(user, shop) {
  if (user.role === 'seller' && user.shop_id && user.shop_id === shop.id) {
    return 'You cannot follow your own shop';
  }
  return null;
}

export const followShop = async (req, res) => {
  try {
    const shopId = parseInt(req.params.id, 10);
    if (!shopId || Number.isNaN(shopId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shop id',
        data: null
      });
    }

    const shop = await Shop.findByPk(shopId);
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found',
        data: null
      });
    }

    if (shop.application_status !== 'approved' || shop.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'This shop is not available to follow',
        data: null
      });
    }

    const blockReason = assertCanFollowShop(req.user, shop);
    if (blockReason) {
      return res.status(403).json({
        success: false,
        message: blockReason,
        data: null
      });
    }

    const [, created] = await ShopFollow.findOrCreate({
      where: { user_id: req.user.id, shop_id: shopId },
      defaults: { user_id: req.user.id, shop_id: shopId }
    });

    const followers_count = await ShopFollow.count({ where: { shop_id: shopId } });

    return res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'You are now following this shop' : 'Already following this shop',
      data: {
        shop_id: shopId,
        is_following: true,
        followers_count
      }
    });
  } catch (error) {
    console.error('Follow shop error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to follow shop',
      data: null,
      error: error.message
    });
  }
};

export const unfollowShop = async (req, res) => {
  try {
    const shopId = parseInt(req.params.id, 10);
    if (!shopId || Number.isNaN(shopId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shop id',
        data: null
      });
    }

    const deleted = await ShopFollow.destroy({
      where: { user_id: req.user.id, shop_id: shopId }
    });

    const followers_count = await ShopFollow.count({ where: { shop_id: shopId } });

    if (!deleted) {
      return res.json({
        success: true,
        message: 'You were not following this shop',
        data: {
          shop_id: shopId,
          is_following: false,
          followers_count
        }
      });
    }

    return res.json({
      success: true,
      message: 'Unfollowed shop',
      data: {
        shop_id: shopId,
        is_following: false,
        followers_count
      }
    });
  } catch (error) {
    console.error('Unfollow shop error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to unfollow shop',
      data: null,
      error: error.message
    });
  }
};
