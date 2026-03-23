import db from '../models/index.js';
import { logAudit, auditContext } from '../utils/audit.js';
import { toProductDto, parseVariantsInput } from '../utils/productDto.js';

const { Product, Category, Shop } = db;

const asBool = (v) => v === true || v === 'true';

/** Accept API-style flags or legacy is_hot / is_special */
const pickHot = (body) => body.is_hot_sale ?? body.is_hot;
const pickSpecial = (body) => body.is_special_offer ?? body.is_special;

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
      specifications,
      points,
      variants,
      is_new_arrival
    } = req.body;

    const isHot = pickHot(req.body);
    const isSpecial = pickSpecial(req.body);

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

    // Verify category exists and is an admin-created category (sellers can only select from these)
    const category = await Category.findByPk(category_id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    if (category.shop_id !== null || category.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'You can only assign products to categories created by the admin. Please select a category from your shop\'s category list.'
      });
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

    // Parse specifications if provided
    let specificationsObj = null;
    if (specifications) {
      try {
        specificationsObj = typeof specifications === 'string' 
          ? JSON.parse(specifications) 
          : specifications;
      } catch (e) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid specifications format. Must be valid JSON object.' 
        });
      }
    }

    let variantsPayload = null;
    if (variants !== undefined && variants !== null) {
      try {
        const parsed = parseVariantsInput(variants);
        variantsPayload = parsed.length ? parsed : null;
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: e.message || 'Invalid variants format'
        });
      }
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
      is_featured: asBool(is_featured),
      is_hot: asBool(isHot),
      is_special: asBool(isSpecial),
      is_new_arrival: is_new_arrival !== undefined ? asBool(is_new_arrival) : false,
      specifications: specificationsObj,
      variants: variantsPayload,
      points: points != null ? parseInt(points, 10) || 0 : 0
    });

    // Update shop product count
    shop.total_products = (shop.total_products || 0) + 1;
    await shop.save();

    await logAudit({
      ...auditContext(req),
      action: 'seller.product.create',
      actor_user_id: req.user.id,
      target_type: 'product',
      target_id: product.id,
      metadata: { shop_id: shop.id, product_name: name, category_id, price }
    });

    const full = await Product.findByPk(product.id, {
      include: [
        { model: Category, as: 'category' },
        { model: Shop, as: 'shop' }
      ]
    });

    return res.json({
      success: true,
      message: 'Product created successfully',
      data: {
        product: toProductDto(full),
        product_id: `prod_${String(product.id).padStart(3, '0')}`
      }
    });
  } catch (error) {
    console.error('Seller create product error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create product', error: error.message });
  }
};

export const listForShop = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { page, limit: limitParam, per_page } = req.query;

    // Verify shop exists
    const shop = await Shop.findByPk(shopId);
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    const perPage = Math.min(parseInt(limitParam || per_page, 10) || 30, 100);
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (currentPage - 1) * perPage;

    const { count, rows: products } = await Product.findAndCountAll({
      where: { shop_id: shopId },
      include: [
        { model: Category, as: 'category' },
        { model: Shop, as: 'shop' }
      ],
      order: [['id', 'DESC']],
      limit: perPage,
      offset
    });

    const totalPages = Math.ceil(count / perPage);

    return res.json({
      success: true,
      message: 'Products retrieved successfully',
      data: {
        products: (products || []).map((p) => toProductDto(p)),
        pagination: {
          current_page: currentPage,
          per_page: perPage,
          total_items: count,
          total_pages: totalPages,
          has_next: currentPage < totalPages,
          has_prev: currentPage > 1
        }
      }
    });
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
      specifications,
      points,
      variants,
      is_new_arrival
    } = req.body;

    const isHot = pickHot(req.body);
    const isSpecial = pickSpecial(req.body);

    // Update fields if provided
    if (name != null) product.name = name;
    if (category_id != null) {
      const category = await Category.findByPk(category_id);
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }
      if (category.shop_id !== null || category.status !== 'approved') {
        return res.status(400).json({
          success: false,
          message: 'You can only assign products to categories created by the admin. Please select a category from your shop\'s category list.'
        });
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
    if (is_featured !== undefined) product.is_featured = asBool(is_featured);
    if (req.body.is_hot !== undefined || req.body.is_hot_sale !== undefined) {
      product.is_hot = asBool(isHot);
    }
    if (req.body.is_special !== undefined || req.body.is_special_offer !== undefined) {
      product.is_special = asBool(isSpecial);
    }
    if (is_new_arrival !== undefined) product.is_new_arrival = asBool(is_new_arrival);
    if (variants !== undefined) {
      try {
        const parsed = parseVariantsInput(variants);
        product.variants = parsed.length ? parsed : null;
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: e.message || 'Invalid variants format'
        });
      }
    }
    if (specifications !== undefined) {
      try {
        product.specifications = typeof specifications === 'string' 
          ? JSON.parse(specifications) 
          : specifications;
      } catch (e) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid specifications format. Must be valid JSON object.' 
        });
      }
    }
    if (points !== undefined) product.points = parseInt(points, 10) || 0;

    // Recalculate discount if original_price and price changed
    if (product.original_price && product.original_price > product.price && !product.discount) {
      product.discount = Math.round(((product.original_price - product.price) / product.original_price) * 100);
    }

    await product.save();

    await logAudit({
      ...auditContext(req),
      action: 'seller.product.update',
      actor_user_id: req.user.id,
      target_type: 'product',
      target_id: product.id,
      metadata: { shop_id: shop.id, product_name: product.name }
    });

    const full = await Product.findByPk(product.id, {
      include: [
        { model: Category, as: 'category' },
        { model: Shop, as: 'shop' }
      ]
    });

    return res.json({
      success: true,
      message: 'Product updated successfully',
      data: { product: toProductDto(full) }
    });
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
      ...auditContext(req),
      action: 'seller.product.delete',
      actor_user_id: req.user.id,
      target_type: 'product',
      target_id: productId,
      metadata: { shop_id: shop.id, product_name: product.name }
    });

    return res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Seller delete product error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete product', error: error.message });
  }
};

