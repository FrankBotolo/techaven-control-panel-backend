import db from '../models/index.js';
import { logAudit } from '../utils/audit.js';

const { Category, Shop } = db;

export const create = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { category_name, description, icon_url, image_url } = req.body;

    if (!category_name) {
      return res.status(400).json({ success: false, message: 'category_name is required' });
    }

    if (!icon_url) {
      return res.status(400).json({ success: false, message: 'icon_url is required' });
    }

    const shop = await Shop.findByPk(shopId);
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });

    const category = await Category.create({
      shop_id: shop.id,
      name: category_name,
      description: description || null,
      icon: icon_url,
      image: image_url || null,
      status: 'pending'
    });

    await logAudit({
      action: 'seller.category.create',
      actor_user_id: req.user.id,
      target_type: 'category',
      target_id: category.id,
      metadata: { shop_id: shop.id, category_name, description, icon_url, image_url },
      ip_address: req.ip
    });

    return res.json({
      success: true,
      message: 'Category added successfully',
      data: { category_id: `cat_${String(category.id).padStart(3, '0')}` }
    });
  } catch (error) {
    console.error('Seller create category error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add category', error: error.message });
  }
};

export const listForShop = async (req, res) => {
  try {
    const { shopId } = req.params;
    const categories = await Category.findAll({
      where: { shop_id: shopId },
      order: [['id', 'DESC']]
    });

    return res.json({ success: true, message: 'Categories retrieved', data: categories });
  } catch (error) {
    console.error('Seller list categories error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch categories', error: error.message });
  }
};


