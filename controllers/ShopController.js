import { Op } from 'sequelize';
import db from '../models/index.js';
import { logAudit, auditContext } from '../utils/audit.js';
import { toProductDto } from '../utils/productDto.js';

const { Shop, Product, Category, User, ShopFollow, sequelize } = db;

async function followerCountByShopIds(shopIds) {
  if (!shopIds.length) return new Map();
  const rows = await ShopFollow.findAll({
    attributes: [
      'shop_id',
      [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']
    ],
    where: { shop_id: { [Op.in]: shopIds } },
    group: ['shop_id'],
    raw: true
  });
  return new Map(rows.map((r) => [r.shop_id, parseInt(r.cnt, 10) || 0]));
}

export const index = async (req, res) => {
  try {
    const shops = await Shop.findAll({
      include: [{
        model: Product,
        as: 'products',
        attributes: ['id']
      }]
    });

    const shopsWithCount = shops.map(shop => {
      const shopData = shop.toJSON();
      shopData.product_ids = shop.products.map(p => p.id);
      shopData.total_products = shop.products.length;
      delete shopData.products;
      return shopData;
    });

    const followerMap = await followerCountByShopIds(shopsWithCount.map((s) => s.id));

    const formatted = shopsWithCount.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description || null,
      logo: s.logo || null,
      banner: s.banner || null,
      rating: parseFloat(s.rating) || 0,
      total_reviews: s.total_reviews || 0,
      location: s.location || s.address || null,
      phone: s.phone || null,
      email: s.email || null,
      is_verified: !!s.is_verified,
      joined_date: s.joined_date || null,
      total_products: s.total_products,
      followers_count: followerMap.get(s.id) || 0
    }));
    return res.json({
      success: true,
      message: 'Shops retrieved',
      data: formatted
    });
  } catch (error) {
    console.error('Shops index error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch shops',
      data: null,
      error: error.message
    });
  }
};

export const show = async (req, res) => {
  try {
    const { id } = req.params;
    const shop = await Shop.findByPk(id, {
      include: [{
        model: Product,
        as: 'products'
      }]
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found',
        data: null
      });
    }

    const s = shop.toJSON();
    const productCount =
      Array.isArray(s.products) ? s.products.length : await Product.count({ where: { shop_id: id } });
    const followers_count = await ShopFollow.count({ where: { shop_id: id } });

    let is_following = false;
    if (req.user) {
      const f = await ShopFollow.findOne({
        where: { user_id: req.user.id, shop_id: parseInt(id, 10) }
      });
      is_following = !!f;
    }

    const shopData = {
      id: s.id,
      name: s.name,
      description: s.description || null,
      logo: s.logo || null,
      banner: s.banner || null,
      rating: parseFloat(s.rating) || 0,
      total_reviews: s.total_reviews || 0,
      location: s.location || s.address || null,
      phone: s.phone || null,
      email: s.email || null,
      is_verified: !!s.is_verified,
      joined_date: s.joined_date || null,
      total_products: productCount,
      followers_count,
      is_following
    };
    return res.json({
      success: true,
      message: 'Shop retrieved',
      data: shopData
    });
  } catch (error) {
    console.error('Shop show error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch shop',
      data: null,
      error: error.message
    });
  }
};

export const products = async (req, res) => {
  try {
    const { id } = req.params;
    const { page, limit: limitParam, per_page } = req.query;
    const shop = await Shop.findByPk(id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found',
        data: null
      });
    }

    const perPage = Math.min(parseInt(limitParam || per_page, 10) || 30, 100);
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (currentPage - 1) * perPage;

    const { count, rows: productRows } = await Product.findAndCountAll({
      where: { shop_id: id },
      include: [
        { model: Category, as: 'category' },
        { model: Shop, as: 'shop' }
      ],
      order: [['id', 'DESC']],
      limit: perPage,
      offset
    });

    const totalPages = Math.ceil(count / perPage);

    return res.json({
      success: true,
      message: 'Products retrieved successfully',
      data: {
        products: (productRows || []).map((p) => toProductDto(p)),
        pagination: {
          current_page: currentPage,
          per_page: perPage,
          total_items: count,
          total_pages: totalPages,
          has_next: currentPage < totalPages,
          has_prev: currentPage > 1
        }
      }
    });
  } catch (error) {
    console.error('Shop products error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch shop products',
      data: null,
      error: error.message
    });
  }
};

export const getByOwner = async (req, res) => {
  try {
    const { ownerId } = req.params;

    // First, find the user to get their shop_id
    const user = await User.findByPk(ownerId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Owner not found'
      });
    }

    if (!user.shop_id) {
      return res.json({
        status: 'success',
        data: [],
        message: 'Owner is not associated with any shop'
      });
    }

    // Find shops where the owner is associated
    const shops = await Shop.findAll({
      where: { id: user.shop_id },
      include: [
        {
          model: Product,
          as: 'products',
          attributes: ['id']
        },
        {
          model: User,
          as: 'users',
          attributes: ['id', 'name', 'email', 'role']
        }
      ],
      order: [['id', 'DESC']]
    });

    const shopsWithCount = shops.map(shop => {
      const shopData = shop.toJSON();
      shopData.product_ids = shop.products.map(p => p.id);
      shopData.total_products = shop.products.length;
      shopData.owners = shop.users || [];
      delete shopData.products;
      return shopData;
    });

    return res.json({
      status: 'success',
      data: shopsWithCount
    });
  } catch (error) {
    console.error('Get shops by owner error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch shops by owner',
      error: error.message
    });
  }
};

export const updateShop = async (req, res) => {
  try {
    const { id } = req.params;
    const shopId = parseInt(id, 10);
    if (!shopId || Number.isNaN(shopId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shop id',
        data: null
      });
    }

    if (
      !req.user ||
      req.user.role !== 'seller' ||
      !req.user.shop_id ||
      req.user.shop_id !== shopId
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own shop. Sellers should use PATCH /api/sellers/:shopId/shop.',
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

    const { shop_name, name, location, address, phone, email, status, logo_url, logo, description, images } =
      req.body;

    const nextName = name ?? shop_name;
    if (nextName != null) shop.name = nextName;
    if (description !== undefined) shop.description = description;
    if (location != null) shop.location = location;
    if (address != null) shop.address = address;
    if (phone != null) shop.phone = phone;
    if (email != null) shop.email = email;
    if (status != null) shop.status = status;
    const nextLogo = logo !== undefined ? logo : logo_url;
    if (nextLogo != null) shop.logo = nextLogo;
    if (images !== undefined) shop.images = images;

    await shop.save();

    await logAudit({
      ...auditContext(req),
      action: 'shop.update',
      actor_user_id: req.user.id,
      target_type: 'shop',
      target_id: shop.id,
      metadata: { shop_name: nextName, location, address, phone, email, status, logo_url: nextLogo, description, images }
    });

    return res.json({
      success: true,
      message: 'Shop updated successfully',
      data: shop
    });
  } catch (error) {
    console.error('Update shop error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update shop',
      data: null,
      error: error.message
    });
  }
};

