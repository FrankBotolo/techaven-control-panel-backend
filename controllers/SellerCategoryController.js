import db from '../models/index.js';
import { logAudit } from '../utils/audit.js';

const { Category, Shop } = db;

export const create = async (req, res) => {
  try {
    const { shopId } = req.params;
    // Accept both 'name' (from API docs) and 'category_name' (backward compatibility)
    const { name, category_name, description, icon, icon_url, image, image_url } = req.body;

    // Use name or category_name (name takes precedence)
    const categoryName = name || category_name;
    if (!categoryName) {
      return res.status(400).json({ success: false, message: 'name (or category_name) is required' });
    }

    // Accept both 'icon' and 'icon_url' (icon takes precedence) - optional
    const categoryIcon = icon || icon_url || null;

    // Accept both 'image' and 'image_url' (image takes precedence) - optional
    const categoryImage = image || image_url || null;

    const shop = await Shop.findByPk(shopId);
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });

    const category = await Category.create({
      shop_id: shop.id,
      name: categoryName,
      description: description || null,
      icon: categoryIcon,
      image: categoryImage,
      status: 'approved' // Categories are automatically approved
    });

    await logAudit({
      action: 'seller.category.create',
      actor_user_id: req.user.id,
      target_type: 'category',
      target_id: category.id,
      metadata: { shop_id: shop.id, category_name: categoryName, description, icon_url: categoryIcon, image_url: categoryImage },
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


