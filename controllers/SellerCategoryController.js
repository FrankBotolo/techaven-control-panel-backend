import db from '../models/index.js';

const { Category, Shop } = db;

/**
 * Categories are created by admin only. Sellers use this list to select a category
 * when adding/editing products. Returns only global (admin-created) approved categories.
 */
export const listForShop = async (req, res) => {
  try {
    const { shopId } = req.params;
    const shop = await Shop.findByPk(shopId);
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }
    const categories = await Category.findAll({
      where: { shop_id: null, status: 'approved' },
      order: [['name', 'ASC']]
    });
    return res.json({ success: true, message: 'Categories retrieved (select one when adding products)', data: categories });
  } catch (error) {
    console.error('Seller list categories error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch categories', error: error.message });
  }
};


