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
      order: [['id', 'DESC']]
    });

    // Calculate totals
    let totalItems = 0;
    let totalAmount = 0;

    const items = cartItems.map(item => {
      const product = item.product;
      const unitPrice = parseFloat(product.price) || 0;
      const itemTotal = unitPrice * item.quantity;
      totalItems += item.quantity;
      totalAmount += itemTotal;

      return {
        id: `item_${item.id}`,
        product_id: product.id,
        product_name: product.name,
        product_image: product.image || product.image_url || null,
        unit_price: unitPrice,
        quantity: item.quantity,
        subtotal: itemTotal,
        is_available: (product.stock || 0) >= item.quantity
      };
    });

    return res.json({
      success: true,
      message: 'Cart retrieved',
      data: {
        id: `cart_${userId}`,
        items,
        summary: {
          subtotal: totalAmount,
          discount: 0,
          shipping: 0,
          tax: 0,
          total: totalAmount,
          currency: 'MWK',
          item_count: totalItems
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
      return res.status(409).json({
        success: false,
        message: 'Item already in cart (use update instead)'
      });
    }

    // Create new cart item
    const cartItem = await Cart.create({
      user_id: userId,
      product_id: product_id,
      quantity: qty
    });

    // Get updated cart count
    const cartItemCount = await Cart.count({ where: { user_id: userId } });

    return res.status(201).json({
      success: true,
      message: 'Item added to cart',
      data: {
        item_id: `item_${cartItem.id}`,
        cart_item_count: cartItemCount
      }
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
    const { item_id } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    // Extract numeric ID from item_id (e.g., "item_1" -> 1)
    const numericId = item_id.toString().replace('item_', '');
    
    const cartItem = await Cart.findOne({
      where: {
        id: numericId,
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

    const subtotal = parseFloat(cartItem.product.price || 0) * quantity;

    return res.json({
      success: true,
      message: 'Cart item updated',
      data: {
        item_id: `item_${cartItem.id}`,
        quantity: quantity,
        subtotal: subtotal
      }
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
    const { item_id } = req.params;

    // Extract numeric ID from item_id (e.g., "item_1" -> 1)
    const numericId = item_id.toString().replace('item_', '');
    
    const cartItem = await Cart.findOne({
      where: {
        id: numericId,
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

    // Get updated cart count
    const cartItemCount = await Cart.count({ where: { user_id: userId } });

    return res.json({
      success: true,
      message: 'Item removed from cart',
      data: {
        cart_item_count: cartItemCount
      }
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
      message: 'Cart cleared',
      data: null
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

