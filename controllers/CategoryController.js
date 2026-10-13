import db from '../models/index.js';
import { toProductDto } from '../utils/productDto.js';

const { Category, Product, Shop } = db;

export const index = async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { shop_id: null, status: 'approved' },
      order: [['name', 'ASC']]
    });

    const withCount = await Promise.all(categories.map(async (c) => {
      let product_count = await Product.count({ where: { category_id: c.id } });
      if (c.name === 'Loans') {
        const [rows] = await db.sequelize.query(`SELECT COUNT(DISTINCT v.device_id) AS count
          FROM seller_listing_categories lc JOIN seller_listings l ON l.id = lc.listing_id
          JOIN device_variants v ON v.id = l.device_variant_id JOIN devices d ON d.id = v.device_id
          JOIN shops s ON s.id = l.shop_id JOIN brands b ON b.id = d.brand_id
          WHERE lc.category_id = ? AND l.status = 'active' AND l.quantity > 0
          AND v.is_active = 1 AND d.is_active = 1 AND b.is_active = 1
          AND s.status = 'active' AND s.application_status = 'approved'`, { replacements: [c.id] });
        product_count = Number(rows[0].count);
      }
      const [brands] = await db.sequelize.query(`SELECT b.slug, b.name, COUNT(DISTINCT d.id) AS product_count,
        MAX(COALESCE((SELECT dm.url FROM device_media dm WHERE dm.device_id = d.id AND dm.media_type = 'image'
          ORDER BY dm.is_primary DESC, dm.sort_order ASC, dm.id ASC LIMIT 1), NULLIF(d.primary_image_url, ''))) AS image
        FROM devices d JOIN brands b ON b.id = d.brand_id JOIN device_variants v ON v.device_id = d.id
        JOIN seller_listings l ON l.device_variant_id = v.id JOIN shops s ON s.id = l.shop_id
        WHERE d.is_active = 1 AND b.is_active = 1 AND v.is_active = 1
        AND l.status = 'active' AND l.quantity > 0 AND s.status = 'active' AND s.application_status = 'approved'
        AND ${c.name === 'Loans' ? 'EXISTS (SELECT 1 FROM seller_listing_categories lc WHERE lc.listing_id = l.id AND lc.category_id = ?)' : 'd.category_id = ?'}
        GROUP BY b.id, b.slug, b.name ORDER BY product_count DESC, b.name ASC`, { replacements: [c.id] });
      return {
        id: c.id,
        name: c.name,
        icon: c.icon || null,
        color: c.color || null,
        image: c.image || null,
        product_count,
        brands: brands.map((brand) => ({ ...brand, product_count: Number(brand.product_count) }))
      };
    }));
    return res.json({
      success: true,
      message: 'Categories retrieved',
      data: withCount
    });
  } catch (error) {
    console.error('Categories index error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      data: null,
      error: error.message
    });
  }
};

export const getProductsByCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { page, limit: limitParam, per_page } = req.query;

    // Verify category exists
    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
        data: null
      });
    }

    const perPage = Math.min(parseInt(limitParam || per_page, 10) || 30, 100);
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (currentPage - 1) * perPage;

    const { count, rows: products } = await Product.findAndCountAll({
      where: { category_id: id },
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
        products: (products || []).map((p) => toProductDto(p)),
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
    console.error('Get products by category error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch products by category',
      data: null,
      error: error.message
    });
  }
};

