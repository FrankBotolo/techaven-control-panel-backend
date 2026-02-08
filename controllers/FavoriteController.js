import db from '../models/index.js';

const { Favorite, Product, Category, Shop } = db;

// Get all liked/favorited products
export const getFavorites = async (req, res) => {
  try {
    const userId = req.user.id;

    const favorites = await Favorite.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Product,
          as: 'product',
          include: [
            { model: Category, as: 'category' },
            { model: Shop, as: 'shop' }
          ]
        }
      ],
      order: [['id', 'DESC']]
    });

    const items = favorites.map(favorite => {
      const product = favorite.product;
      return {
        id: `wish_${favorite.id}`,
        product: {
          id: product.id,
          name: product.name,
          price: parseFloat(product.price) || 0,
          original_price: parseFloat(product.original_price) || null,
          thumbnail: product.image || product.image_url || null,
          is_in_stock: (product.stock || 0) > 0,
          rating: 0 // TODO: Calculate from reviews
        },
        added_at: favorite.createdAt || favorite.created_at || new Date()
      };
    });

    return res.json({
      success: true,
      message: 'Wishlist retrieved',
      data: {
        items,
        total_items: items.length
      }
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve favorites',
      error: error.message
    });
  }
};

// Add product to favorites (Like)
export const addToFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
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

    // Check if already favorited
    const existingFavorite = await Favorite.findOne({
      where: {
        user_id: userId,
        product_id: product_id
      }
    });

    if (existingFavorite) {
      return res.status(400).json({
        success: false,
        message: 'Product is already in favorites'
      });
    }

    // Create favorite
    const favorite = await Favorite.create({
      user_id: userId,
      product_id: product_id
    });

    const totalItems = await Favorite.count({ where: { user_id: userId } });

    return res.status(201).json({
      success: true,
      message: 'Added to wishlist',
      data: {
        wishlist_item_id: `wish_${favorite.id}`,
        total_items: totalItems
      }
    });
  } catch (error) {
    console.error('Add to favorites error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add product to favorites',
      error: error.message
    });
  }
};

// Remove product from favorites (Unlike)
export const removeFromFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const favorite = await Favorite.findOne({
      where: {
        user_id: userId,
        product_id: productId
      }
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in favorites'
      });
    }

    await favorite.destroy();

    const totalItems = await Favorite.count({ where: { user_id: userId } });

    return res.json({
      success: true,
      message: 'Removed from wishlist',
      data: {
        total_items: totalItems
      }
    });
  } catch (error) {
    console.error('Remove from favorites error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove product from favorites',
      error: error.message
    });
  }
};

// Check if product is favorited
export const checkFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const favorite = await Favorite.findOne({
      where: {
        user_id: userId,
        product_id: productId
      }
    });

    return res.json({
      success: true,
      data: {
        is_favorited: !!favorite,
        favorite_id: favorite ? favorite.id : null
      }
    });
  } catch (error) {
    console.error('Check favorite error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check favorite status',
      error: error.message
    });
  }
};

