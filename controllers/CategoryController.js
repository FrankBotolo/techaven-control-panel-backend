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
      const product_count = await Product.count({ where: { category_id: c.id } });
      return {
        id: c.id,
        name: c.name,
        icon: c.icon || null,
        color: c.color || null,
        image: c.image || null,
        product_count
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

