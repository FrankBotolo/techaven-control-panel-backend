import db from '../models/index.js';
import { Op } from 'sequelize';

const { Product, Category, Shop, Review, User } = db;

// Helper function to update product rating and total reviews
const updateProductRating = async (productId) => {
  try {
    const reviews = await Review.findAll({
      where: { product_id: productId },
      attributes: ['rating']
    });
    
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(2)
      : 0;
    
    await Product.update(
      {
        rating: parseFloat(averageRating),
        total_reviews: totalReviews
      },
      {
        where: { id: productId }
      }
    );
  } catch (error) {
    console.error('Error updating product rating:', error);
  }
};

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

export const newArrivals = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get products created in the last 30 days (new arrivals)
    // This works even if is_new_arrival column doesn't exist
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const products = await Product.findAll({
      where: {
        createdAt: { [Op.gte]: thirtyDaysAgo }
      },
      include: [
        { model: Category, as: 'category' },
        { model: Shop, as: 'shop' }
      ],
      limit: parseInt(limit),
      order: [['id', 'DESC']]
    });

    return res.json({
      success: true,
      message: 'New arrivals retrieved',
      data: {
        products
      }
    });
  } catch (error) {
    console.error('New arrivals error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch new arrivals',
      error: error.message
    });
  }
};

export const getReviews = async (req, res) => {
  try {
    const { product_id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Get reviews with user information
    const { count, rows: reviews } = await Review.findAndCountAll({
      where: { product_id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'avatar_url']
        }
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [['id', 'DESC']]
    });
    
    // Calculate summary statistics
    const allReviews = await Review.findAll({
      where: { product_id },
      attributes: ['rating']
    });
    
    const totalReviews = allReviews.length;
    const averageRating = totalReviews > 0
      ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(2)
      : 0;
    
    const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    allReviews.forEach(review => {
      ratingBreakdown[review.rating] = (ratingBreakdown[review.rating] || 0) + 1;
    });
    
    // Format reviews for response
    const formattedReviews = reviews.map(review => ({
      id: review.id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      images: review.images || [],
      user: {
        id: review.user?.id,
        name: review.user?.name,
        avatar_url: review.user?.avatar_url
      },
      created_at: review.createdAt || review.created_at || new Date()
    }));
    
    return res.json({
      success: true,
      message: 'Reviews retrieved',
      data: {
        reviews: formattedReviews,
        summary: {
          average_rating: parseFloat(averageRating),
          total_reviews: totalReviews,
          rating_breakdown: ratingBreakdown
        },
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / parseInt(limit)),
          total_items: count,
          items_per_page: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve reviews',
      error: error.message
    });
  }
};

export const addReview = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const userId = req.user.id;
    const { product_id } = req.params;
    const { rating, title, comment, images } = req.body;
    
    if (!rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Rating and comment are required'
      });
    }
    
    // Validate rating (1-5)
    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }
    
    // Verify product exists
    const product = await Product.findByPk(product_id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      where: {
        product_id,
        user_id: userId
      }
    });
    
    if (existingReview) {
      // Update existing review
      existingReview.rating = ratingNum;
      existingReview.title = title || null;
      existingReview.comment = comment;
      existingReview.images = images || null;
      await existingReview.save();
      
      // Recalculate product rating
      await updateProductRating(product_id);
      
      return res.json({
        success: true,
        message: 'Review updated successfully',
        data: {
          id: existingReview.id,
          rating: existingReview.rating,
          title: existingReview.title,
          comment: existingReview.comment,
          images: existingReview.images || [],
          created_at: existingReview.createdAt || existingReview.created_at || new Date(),
          updated_at: existingReview.updatedAt || existingReview.updated_at || new Date()
        }
      });
    }
    
    // Create new review
    const review = await Review.create({
      product_id,
      user_id: userId,
      rating: ratingNum,
      title: title || null,
      comment,
      images: images || null
    });
    
    // Update product rating and total reviews
    await updateProductRating(product_id);
    
    // Fetch user info for response
    const user = await User.findByPk(userId, {
      attributes: ['id', 'name', 'avatar_url']
    });
    
    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: {
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        images: review.images || [],
        user: {
          id: user?.id,
          name: user?.name,
          avatar_url: user?.avatar_url
        },
        created_at: review.createdAt || review.created_at || new Date()
      }
    });
  } catch (error) {
    console.error('Add review error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit review',
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

