import db from '../models/index.js';

const { Cart, Product, Category, Shop } = db;

export const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cartItems = await Cart.findAll({
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
      order: [['created_at', 'DESC']]
    });

    // Calculate totals
    let totalItems = 0;
    let totalAmount = 0;

    const items = cartItems.map(item => {
      const product = item.product;
      const itemTotal = parseFloat(product.price) * item.quantity;
      totalItems += item.quantity;
      totalAmount += itemTotal;

      return {
        id: item.id,
        product_id: product.id,
        product_name: product.name,
        product_image: product.image,
        price: parseFloat(product.price),
        quantity: item.quantity,
        subtotal: itemTotal,
        product: product
      };
    });

    return res.json({
      success: true,
      message: 'Cart retrieved successfully',
      data: {
        items,
        summary: {
          total_items: totalItems,
          total_amount: totalAmount,
          item_count: cartItems.length
        }
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve cart',
      error: error.message
    });
  }
};

export const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_id, quantity } = req.body;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    const qty = quantity || 1;

    // Verify product exists
    const product = await Product.findByPk(product_id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check stock availability
    if (product.stock < qty) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${product.stock} available`
      });
    }

    // Check if item already in cart
    const existingCartItem = await Cart.findOne({
      where: {
        user_id: userId,
        product_id: product_id
      }
    });

    if (existingCartItem) {
      // Update quantity
      const newQuantity = existingCartItem.quantity + qty;
      
      if (product.stock < newQuantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock. Only ${product.stock} available`
        });
      }

      existingCartItem.quantity = newQuantity;
      await existingCartItem.save();

      return res.json({
        success: true,
        message: 'Cart updated successfully',
        data: existingCartItem
      });
    }

    // Create new cart item
    const cartItem = await Cart.create({
      user_id: userId,
      product_id: product_id,
      quantity: qty
    });

    return res.json({
      success: true,
      message: 'Item added to cart successfully',
      data: cartItem
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add item to cart',
      error: error.message
    });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    const cartItem = await Cart.findOne({
      where: {
        id: id,
        user_id: userId
      },
      include: [{ model: Product, as: 'product' }]
    });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    // Check stock availability
    if (cartItem.product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${cartItem.product.stock} available`
      });
    }

    cartItem.quantity = quantity;
    await cartItem.save();

    return res.json({
      success: true,
      message: 'Cart item updated successfully',
      data: cartItem
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update cart item',
      error: error.message
    });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const cartItem = await Cart.findOne({
      where: {
        id: id,
        user_id: userId
      }
    });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    await cartItem.destroy();

    return res.json({
      success: true,
      message: 'Item removed from cart successfully'
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove item from cart',
      error: error.message
    });
  }
};

export const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;

    await Cart.destroy({
      where: { user_id: userId }
    });

    return res.json({
      success: true,
      message: 'Cart cleared successfully'
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear cart',
      error: error.message
    });
  }
};

