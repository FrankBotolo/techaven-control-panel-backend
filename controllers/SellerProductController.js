import db from '../models/index.js';
import { logAudit } from '../utils/audit.js';

const { Product, Category, Shop } = db;

export const create = async (req, res) => {
  try {
    const { shopId } = req.params;
    const {
      name,
      category_id,
      price,
      image_url,
      images_urls,
      description,
      stock,
      original_price,
      discount,
      vendor,
      is_featured,
      is_hot,
      is_special
    } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }
    if (!category_id) {
      return res.status(400).json({ success: false, message: 'category_id is required' });
    }
    if (!price) {
      return res.status(400).json({ success: false, message: 'price is required' });
    }
    if (!image_url) {
      return res.status(400).json({ success: false, message: 'image_url is required' });
    }

    // Verify shop exists
    const shop = await Shop.findByPk(shopId);
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    // Verify category exists
    const category = await Category.findByPk(category_id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Parse images array if provided
    let imagesArray = null;
    if (images_urls) {
      try {
        imagesArray = Array.isArray(images_urls) ? images_urls : JSON.parse(images_urls);
      } catch (e) {
        imagesArray = [images_urls];
      }
    }

    // Calculate discount if original_price is provided but discount is not
    let calculatedDiscount = discount;
    if (original_price && original_price > price && !discount) {
      calculatedDiscount = Math.round(((original_price - price) / original_price) * 100);
    }

    const product = await Product.create({
      shop_id: shop.id,
      category_id: parseInt(category_id),
      name,
      image: image_url,
      images: imagesArray,
      price: parseFloat(price),
      original_price: original_price ? parseFloat(original_price) : null,
      discount: calculatedDiscount || null,
      description: description || null,
      stock: stock ? parseInt(stock) : 0,
      vendor: vendor || shop.name,
      is_featured: is_featured === true || is_featured === 'true',
      is_hot: is_hot === true || is_hot === 'true',
      is_special: is_special === true || is_special === 'true'
    });

    // Update shop product count
    shop.total_products = (shop.total_products || 0) + 1;
    await shop.save();

    await logAudit({
      action: 'seller.product.create',
      actor_user_id: req.user.id,
      target_type: 'product',
      target_id: product.id,
      metadata: { shop_id: shop.id, product_name: name, category_id, price },
      ip_address: req.ip
    });

    return res.json({
      success: true,
      message: 'Product created successfully',
      data: { product_id: `prod_${String(product.id).padStart(3, '0')}` }
    });
  } catch (error) {
    console.error('Seller create product error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create product', error: error.message });
  }
};

export const listForShop = async (req, res) => {
  try {
    const { shopId } = req.params;

    // Verify shop exists
    const shop = await Shop.findByPk(shopId);
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    const products = await Product.findAll({
      where: { shop_id: shopId },
      include: [
        { model: Category, as: 'category' },
        { model: Shop, as: 'shop' }
      ],
      order: [['id', 'DESC']]
    });

    // Add category_id explicitly to each product
    const productsWithCategoryId = products.map(product => {
      const productData = product.toJSON();
      return {
        ...productData,
        category_id: product.category_id
      };
    });

    return res.json({ success: true, message: 'Products retrieved', data: productsWithCategoryId });
  } catch (error) {
    console.error('Seller list products error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch products', error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const { shopId, productId } = req.params;

    // Verify shop exists
    const shop = await Shop.findByPk(shopId);
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    const product = await Product.findOne({
      where: { id: productId, shop_id: shopId }
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const {
      name,
      category_id,
      price,
      image_url,
      images_urls,
      description,
      stock,
      original_price,
      discount,
      vendor,
      is_featured,
      is_hot,
      is_special
    } = req.body;

    // Update fields if provided
    if (name != null) product.name = name;
    if (category_id != null) {
      const category = await Category.findByPk(category_id);
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }
      product.category_id = parseInt(category_id);
    }
    if (price != null) product.price = parseFloat(price);
    if (image_url != null) product.image = image_url;
    if (images_urls != null) {
      try {
        product.images = Array.isArray(images_urls) ? images_urls : JSON.parse(images_urls);
      } catch (e) {
        product.images = [images_urls];
      }
    }
    if (description != null) product.description = description;
    if (stock != null) product.stock = parseInt(stock);
    if (original_price != null) product.original_price = original_price ? parseFloat(original_price) : null;
    if (discount != null) product.discount = discount ? parseInt(discount) : null;
    if (vendor != null) product.vendor = vendor;
    if (is_featured !== undefined) product.is_featured = is_featured === true || is_featured === 'true';
    if (is_hot !== undefined) product.is_hot = is_hot === true || is_hot === 'true';
    if (is_special !== undefined) product.is_special = is_special === true || is_special === 'true';

    // Recalculate discount if original_price and price changed
    if (product.original_price && product.original_price > product.price && !product.discount) {
      product.discount = Math.round(((product.original_price - product.price) / product.original_price) * 100);
    }

    await product.save();

    await logAudit({
      action: 'seller.product.update',
      actor_user_id: req.user.id,
      target_type: 'product',
      target_id: product.id,
      metadata: { shop_id: shop.id, product_name: product.name },
      ip_address: req.ip
    });

    return res.json({ success: true, message: 'Product updated successfully', data: product });
  } catch (error) {
    console.error('Seller update product error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update product', error: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { shopId, productId } = req.params;

    // Verify shop exists
    const shop = await Shop.findByPk(shopId);
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    const product = await Product.findOne({
      where: { id: productId, shop_id: shopId }
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await product.destroy({ force: true });

    // Update shop product count
    shop.total_products = Math.max((shop.total_products || 0) - 1, 0);
    await shop.save();

    await logAudit({
      action: 'seller.product.delete',
      actor_user_id: req.user.id,
      target_type: 'product',
      target_id: productId,
      metadata: { shop_id: shop.id, product_name: product.name },
      ip_address: req.ip
    });

    return res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Seller delete product error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete product', error: error.message });
  }
};

