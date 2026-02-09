import db from '../models/index.js';
import { logAudit } from '../utils/audit.js';

const { Product, Shop, Category } = db;

export const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findByPk(productId, {
      include: [
        {
          model: Shop,
          as: 'shop',
          attributes: ['id', 'name']
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const productIdForAudit = product.id;
    const productName = product.name;
    const shopId = product.shop_id;
    const shop = product.shop;

    // Hard delete - permanently remove the product from database
    await product.destroy({ force: true });

    // Update shop product count if shop exists
    if (shop) {
      shop.total_products = Math.max((shop.total_products || 0) - 1, 0);
      await shop.save();
    }

    await logAudit({
      action: 'admin.product.delete',
      actor_user_id: req.user.id,
      target_type: 'product',
      target_id: productIdForAudit,
      metadata: { 
        hard_delete: true, 
        product_name: productName,
        shop_id: shopId,
        shop_name: shop?.name || null
      },
      ip_address: req.ip
    });

    return res.json({ 
      success: true, 
      message: 'Product deleted successfully' 
    });
  } catch (error) {
    console.error('Admin delete product error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete product', error: error.message });
  }
};

