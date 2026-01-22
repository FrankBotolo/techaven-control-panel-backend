import db from '../models/index.js';
import { logAudit } from '../utils/audit.js';

const { Shop, Product, Category, User } = db;

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

    return res.json({
      status: 'success',
      data: shopsWithCount
    });
  } catch (error) {
    console.error('Shops index error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch shops',
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
        status: 'error',
        message: 'Shop not found'
      });
    }

    const shopData = shop.toJSON();
    shopData.product_ids = shop.products.map(p => p.id);
    shopData.total_products = shop.products.length;

    return res.json({
      status: 'success',
      data: shopData
    });
  } catch (error) {
    console.error('Shop show error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch shop',
      error: error.message
    });
  }
};

export const products = async (req, res) => {
  try {
    const { id } = req.params;
    const shop = await Shop.findByPk(id);

    if (!shop) {
      return res.status(404).json({
        status: 'error',
        message: 'Shop not found'
      });
    }

    const products = await Product.findAll({
      where: { shop_id: id },
      include: [
        { model: Category, as: 'category' },
        { model: Shop, as: 'shop' }
      ]
    });

    return res.json({
      status: 'success',
      data: products
    });
  } catch (error) {
    console.error('Shop products error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch shop products',
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
    const shop = await Shop.findByPk(id);
    
    if (!shop) {
      return res.status(404).json({
        status: 'error',
        message: 'Shop not found'
      });
    }

    const { shop_name, location, address, phone, email, status, logo_url } = req.body;

    if (shop_name != null) shop.name = shop_name;
    if (location != null) shop.location = location;
    if (address != null) shop.address = address;
    if (phone != null) shop.phone = phone;
    if (email != null) shop.email = email;
    if (status != null) shop.status = status;
    if (logo_url != null) shop.logo = logo_url;

    await shop.save();

    // Log audit if user is authenticated
    if (req.user) {
      await logAudit({
        action: 'shop.update',
        actor_user_id: req.user.id,
        target_type: 'shop',
        target_id: shop.id,
        metadata: { shop_name, location, address, phone, email, status, logo_url },
        ip_address: req.ip
      });
    }

    return res.json({
      status: 'success',
      message: 'Shop updated successfully',
      data: shop
    });
  } catch (error) {
    console.error('Update shop error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update shop',
      error: error.message
    });
  }
};

