import db from '../models/index.js';
import { logAudit, auditContext } from '../utils/audit.js';

const { Shop } = db;

/**
 * Seller updates storefront details for their own shop only.
 * Does not allow changing application_status, is_verified, status, or verification docs (admin flows).
 */
export const updateMyShop = async (req, res) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
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

    const {
      name,
      shop_name,
      description,
      location,
      address,
      phone,
      email,
      logo,
      logo_url,
      images,
      points_mwk_per_point
    } = req.body;

    const nextName = name ?? shop_name;
    if (nextName !== undefined && nextName !== null) shop.name = nextName;
    if (description !== undefined) shop.description = description;
    if (location !== undefined) shop.location = location;
    if (address !== undefined) shop.address = address;
    if (phone !== undefined) shop.phone = phone;
    if (email !== undefined) shop.email = email;
    const nextLogo = logo !== undefined ? logo : logo_url;
    if (nextLogo !== undefined) shop.logo = nextLogo;
    if (images !== undefined) shop.images = images;
    if (points_mwk_per_point !== undefined) {
      if (points_mwk_per_point === null || points_mwk_per_point === '') {
        shop.points_mwk_per_point = null;
      } else {
        const r = parseFloat(points_mwk_per_point);
        if (Number.isNaN(r) || r < 0) {
          return res.status(400).json({
            success: false,
            message: 'points_mwk_per_point must be a non-negative number (MWK per 1 loyalty point), or null to disable',
            data: null
          });
        }
        shop.points_mwk_per_point = r;
      }
    }

    await shop.save();

    await logAudit({
      ...auditContext(req),
      action: 'seller.shop.update',
      actor_user_id: req.user.id,
      target_type: 'shop',
      target_id: shop.id,
      metadata: {
        name: nextName,
        description,
        location,
        address,
        phone,
        email,
        logo: nextLogo,
        images,
        points_mwk_per_point
      }
    });

    return res.json({
      success: true,
      message: 'Shop updated successfully',
      data: shop
    });
  } catch (error) {
    console.error('Seller update shop error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update shop',
      data: null,
      error: error.message
    });
  }
};
