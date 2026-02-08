import db from '../models/index.js';
import { Op } from 'sequelize';

const { Product, Category } = db;

export const search = async (req, res) => {
  try {
    const { q, page = 1, limit = 20, category_id, min_price, max_price, sort = 'relevance' } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    const whereClause = {
      name: { [Op.like]: `%${q}%` }
    };
    
    if (category_id) {
      whereClause.category_id = category_id;
    }
    
    if (min_price || max_price) {
      whereClause.price = {};
      if (min_price) whereClause.price[Op.gte] = min_price;
      if (max_price) whereClause.price[Op.lte] = max_price;
    }
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const { count, rows: products } = await Product.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: offset,
      order: sort === 'price_asc' ? [['price', 'ASC']] : 
             sort === 'price_desc' ? [['price', 'DESC']] :
             sort === 'newest' ? [['created_at', 'DESC']] :
             [['name', 'ASC']]
    });
    
    // TODO: Implement suggestions and filters
    const suggestions = [];
    const filters = {
      categories: [],
      price_range: { min: 0, max: 0 }
    };
    
    return res.json({
      success: true,
      message: 'Search results',
      data: {
        query: q,
        products,
        suggestions,
        filters,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / parseInt(limit)),
          total_items: count
        }
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message
    });
  }
};

export const getSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        message: 'Suggestions retrieved',
        data: {
          suggestions: []
        }
      });
    }
    
    // TODO: Implement autocomplete suggestions
    const suggestions = [];
    
    return res.json({
      success: true,
      message: 'Suggestions retrieved',
      data: {
        suggestions
      }
    });
  } catch (error) {
    console.error('Get suggestions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get suggestions',
      error: error.message
    });
  }
};

