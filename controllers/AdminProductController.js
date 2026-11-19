import { Op } from 'sequelize';
import db from '../models/index.js';
import { logAudit, auditContext } from '../utils/audit.js';
import { toProductDto } from '../utils/productDto.js';

const { Product, Shop, Category } = db;

const productInclude = [
  { model: Shop, as: 'shop', attributes: ['id', 'name'] },
  { model: Category, as: 'category', attributes: ['id', 'name'] }
];

/**
 * GET /api/admin/products?page&limit&search&shop_id&category_id&flag=featured|hot|special|low_stock
 * Paginated product moderation list across every shop.
 */
export const listProducts = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const where = {};
    if (req.query.search) where.name = { [Op.like]: `%${req.query.search}%` };
    if (req.query.shop_id) where.shop_id = parseInt(req.query.shop_id, 10);
    if (req.query.category_id) where.category_id = parseInt(req.query.category_id, 10);
    const flags = { featured: 'is_featured', hot: 'is_hot', special: 'is_special' };
    if (flags[req.query.flag]) where[flags[req.query.flag]] = true;
    if (req.query.flag === 'low_stock') where.stock = { [Op.lte]: 5 };

    const { rows, count } = await Product.findAndCountAll({
      where,
      include: productInclude,
      order: [['id', 'DESC']],
      limit,
      offset: (page - 1) * limit,
      distinct: true
    });
    return res.json({
      success: true,
      message: 'Products retrieved',
      data: {
        products: rows.map(toProductDto),
        pagination: { page, limit, total_items: count, total_pages: Math.ceil(count / limit) }
      }
    });
  } catch (error) {
    console.error('Admin list products error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch products', error: error.message });
  }
};

/**
 * PATCH /api/admin/products/:productId
 * Moderation edits: name, description, price, original_price, stock, category_id,
 * is_featured, is_hot (is_hot_sale), is_special (is_special_offer), is_new_arrival.
 */
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const b = req.body || {};
    const updates = {};
    if (b.name !== undefined) {
      if (!String(b.name).trim()) return res.status(400).json({ success: false, message: 'Name cannot be empty' });
      updates.name = String(b.name).trim();
    }
    if (b.description !== undefined) updates.description = b.description || null;
    for (const key of ['price', 'original_price']) {
      if (b[key] === undefined) continue;
      if (b[key] === null || b[key] === '') { if (key === 'original_price') updates[key] = null; continue; }
      const n = Number(b[key]);
      if (!Number.isFinite(n) || n < 0) return res.status(400).json({ success: false, message: `${key} must be a positive number` });
      updates[key] = n;
    }
    if (b.stock !== undefined) {
      const n = parseInt(b.stock, 10);
      if (!Number.isInteger(n) || n < 0) return res.status(400).json({ success: false, message: 'stock must be a non-negative integer' });
      updates.stock = n;
    }
    if (b.category_id !== undefined) {
      const category = await Category.findByPk(b.category_id);
      if (!category) return res.status(400).json({ success: false, message: 'Category not found' });
      updates.category_id = category.id;
    }
    const flagMap = { is_featured: 'is_featured', is_hot: 'is_hot', is_hot_sale: 'is_hot', is_special: 'is_special', is_special_offer: 'is_special', is_new_arrival: 'is_new_arrival' };
    for (const [input, column] of Object.entries(flagMap)) if (b[input] !== undefined) updates[column] = !!b[input];
    if (!Object.keys(updates).length) return res.status(400).json({ success: false, message: 'No valid fields to update' });

    await product.update(updates);
    await logAudit({
      ...auditContext(req),
      action: 'admin.product.update',
      actor_user_id: req.user.id,
      target_type: 'product',
      target_id: product.id,
      metadata: { updated_fields: Object.keys(updates) }
    });
    const fresh = await Product.findByPk(product.id, { include: productInclude });
    return res.json({ success: true, message: 'Product updated', data: toProductDto(fresh) });
  } catch (error) {
    console.error('Admin update product error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update product', error: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findByPk(productId, {
      include: [
        {
          model: Shop,
          as: 'shop',
          attributes: ['id', 'name']
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const productIdForAudit = product.id;
    const productName = product.name;
    const shopId = product.shop_id;
    const shop = product.shop;

    // Hard delete - permanently remove the product from database
    await product.destroy({ force: true });

    // Update shop product count if shop exists
    if (shop) {
      shop.total_products = Math.max((shop.total_products || 0) - 1, 0);
      await shop.save();
    }

    await logAudit({
      ...auditContext(req),
      action: 'admin.product.delete',
      actor_user_id: req.user.id,
      target_type: 'product',
      target_id: productIdForAudit,
      metadata: { 
        hard_delete: true, 
        product_name: productName,
        shop_id: shopId,
        shop_name: shop?.name || null
      }
    });

    return res.json({ 
      success: true, 
      message: 'Product deleted successfully' 
    });
  } catch (error) {
    console.error('Admin delete product error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete product', error: error.message });
  }
};

