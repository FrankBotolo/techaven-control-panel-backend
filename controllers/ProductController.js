import db from '../models/index.js';
import { Op } from 'sequelize';

const { Product, Category, Shop } = db;

export const index = async (req, res) => {
  try {
    const products = await Product.findAll({
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
    console.error('Products index error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch products',
      error: error.message
    });
  }
};

export const featured = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { is_featured: true },
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
    console.error('Featured products error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch featured products',
      error: error.message
    });
  }
};

export const hot = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { is_hot: true },
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
    console.error('Hot products error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch hot products',
      error: error.message
    });
  }
};

export const special = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { is_special: true },
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
    console.error('Special products error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch special products',
      error: error.message
    });
  }
};

export const show = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id, {
      include: [
        { model: Category, as: 'category' },
        { model: Shop, as: 'shop' }
      ]
    });

    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    return res.json({
      status: 'success',
      data: product
    });
  } catch (error) {
    console.error('Product show error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch product',
      error: error.message
    });
  }
};

export const search = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query is required'
      });
    }

    const products = await Product.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${q}%` } },
          { description: { [Op.like]: `%${q}%` } }
        ]
      },
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
    console.error('Product search error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to search products',
      error: error.message
    });
  }
};

export const byCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const products = await Product.findAll({
      where: { category_id: id },
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
    console.error('Products by category error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch products by category',
      error: error.message
    });
  }
};

