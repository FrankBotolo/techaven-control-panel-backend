import db from '../models/index.js';

const { Category, Product, Shop } = db;

export const index = async (req, res) => {
  try {
    const categories = await Category.findAll({
      // All categories are automatically approved, no need to filter
    });

    return res.json({
      status: 'success',
      data: categories
    });
  } catch (error) {
    console.error('Categories index error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch categories',
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
        status: 'error',
        message: 'Category not found'
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
      status: 'success',
      data: products,
      category: {
        id: category.id,
        name: category.name,
        description: category.description
      }
    });
  } catch (error) {
    console.error('Get products by category error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch products by category',
      error: error.message
    });
  }
};

