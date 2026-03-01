import db from '../models/index.js';

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

    // Verify category exists
    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
        data: null
      });
    }

    // Get all products for this category
    const products = await Product.findAll({
      where: { category_id: id },
      include: [
        { model: Category, as: 'category' },
        { model: Shop, as: 'shop' }
      ],
      order: [['id', 'DESC']]
    });

    return res.json({
      success: true,
      message: 'Products retrieved',
      data: products
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

