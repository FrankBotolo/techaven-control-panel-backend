import db from '../models/index.js';
import { logAudit } from '../utils/audit.js';

const { Category, Shop, User, Product } = db;

/** List all categories (for admin management). Global categories have shop_id null. */
export const listAll = async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [['id', 'DESC']],
      include: [
        {
          model: Shop,
          as: 'shop',
          attributes: ['id', 'name'],
          required: false
        }
      ]
    });
    return res.json({ success: true, message: 'Categories retrieved', data: categories });
  } catch (error) {
    console.error('Admin list categories error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch categories', error: error.message });
  }
};

/** Create a new global category (admin only). Sellers will select from these when adding products. Only icon URL is supported (no image). */
export const createCategory = async (req, res) => {
  try {
    const { name, description, icon, icon_url } = req.body;
    const categoryName = name || req.body.category_name;
    if (!categoryName) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }
    const category = await Category.create({
      shop_id: null,
      name: categoryName,
      description: description || null,
      icon: icon || icon_url || null,
      status: 'approved'
    });
    await logAudit({
      action: 'admin.category.create',
      actor_user_id: req.user.id,
      target_type: 'category',
      target_id: category.id,
      metadata: { name: categoryName, description },
      ip_address: req.ip
    });
    return res.json({
      success: true,
      message: 'Category created successfully',
      data: { category_id: category.id, name: category.name }
    });
  } catch (error) {
    console.error('Admin create category error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create category', error: error.message });
  }
};

/** Update a category (admin only). Only icon URL is supported (no image). */
export const updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, description, icon, icon_url } = req.body;
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    if (name != null) category.name = name;
    if (description !== undefined) category.description = description || null;
    if (icon != null || icon_url != null) category.icon = icon || icon_url || category.icon;
    await category.save();
    await logAudit({
      action: 'admin.category.update',
      actor_user_id: req.user.id,
      target_type: 'category',
      target_id: category.id,
      metadata: { name: category.name },
      ip_address: req.ip
    });
    return res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    console.error('Admin update category error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update category', error: error.message });
  }
};

export const listPending = async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { status: 'pending' },
      include: [
        {
          model: Shop,
          as: 'shop',
          attributes: ['id', 'name', 'logo', 'status', 'location', 'address', 'phone', 'email', 'is_verified'],
          include: [
            {
              model: User,
              as: 'users',
              attributes: ['id', 'name', 'email', 'phone_number', 'role', 'avatar_url', 'is_verified'],
              where: { role: 'seller' },
              required: false
            }
          ]
        },
        {
          model: Product,
          as: 'products',
          attributes: ['id', 'name', 'image', 'images', 'price', 'original_price', 'discount', 'stock', 'rating', 'total_reviews', 'description', 'is_featured', 'is_hot', 'is_special', 'vendor', 'specifications'],
          required: false
        }
      ],
      order: [['id', 'DESC']]
    });

    // Add category_id explicitly to each category and rename users to owners
    const categoriesWithId = categories.map(cat => {
      const catData = cat.toJSON();
      const result = {
        ...catData,
        category_id: cat.id
      };
      
      // Rename users to owners for clarity
      if (result.shop && result.shop.users) {
        result.shop.owners = result.shop.users;
        delete result.shop.users;
      }
      
      return result;
    });

    return res.json({ success: true, message: 'Pending categories retrieved', data: categoriesWithId });
  } catch (error) {
    console.error('Admin list pending categories error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch pending categories', error: error.message });
  }
};

export const listRejected = async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { status: 'rejected' },
      include: [
        {
          model: Shop,
          as: 'shop',
          attributes: ['id', 'name', 'logo', 'status', 'location', 'address', 'phone', 'email', 'is_verified'],
          include: [
            {
              model: User,
              as: 'users',
              attributes: ['id', 'name', 'email', 'phone_number', 'role', 'avatar_url', 'is_verified'],
              where: { role: 'seller' },
              required: false
            }
          ]
        },
        {
          model: Product,
          as: 'products',
          attributes: ['id', 'name', 'image', 'images', 'price', 'original_price', 'discount', 'stock', 'rating', 'total_reviews', 'description', 'is_featured', 'is_hot', 'is_special', 'vendor', 'specifications'],
          required: false
        }
      ],
      order: [['id', 'DESC']]
    });

    // Add category_id explicitly to each category and rename users to owners
    const categoriesWithId = categories.map(cat => {
      const catData = cat.toJSON();
      const result = {
        ...catData,
        category_id: cat.id
      };
      
      // Rename users to owners for clarity
      if (result.shop && result.shop.users) {
        result.shop.owners = result.shop.users;
        delete result.shop.users;
      }
      
      return result;
    });

    return res.json({ success: true, message: 'Rejected categories retrieved', data: categoriesWithId });
  } catch (error) {
    console.error('Admin list rejected categories error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch rejected categories', error: error.message });
  }
};

export const listApproved = async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { status: 'approved' },
      include: [
        {
          model: Shop,
          as: 'shop',
          attributes: ['id', 'name', 'logo', 'status', 'location', 'address', 'phone', 'email', 'is_verified'],
          include: [
            {
              model: User,
              as: 'users',
              attributes: ['id', 'name', 'email', 'phone_number', 'role', 'avatar_url', 'is_verified'],
              where: { role: 'seller' },
              required: false
            }
          ]
        },
        {
          model: Product,
          as: 'products',
          attributes: ['id', 'name', 'image', 'images', 'price', 'original_price', 'discount', 'stock', 'rating', 'total_reviews', 'description', 'is_featured', 'is_hot', 'is_special', 'vendor', 'specifications'],
          required: false
        }
      ],
      order: [['id', 'DESC']]
    });

    // Add category_id explicitly to each category and rename users to owners
    const categoriesWithId = categories.map(cat => {
      const catData = cat.toJSON();
      const result = {
        ...catData,
        category_id: cat.id
      };
      
      // Rename users to owners for clarity
      if (result.shop && result.shop.users) {
        result.shop.owners = result.shop.users;
        delete result.shop.users;
      }
      
      return result;
    });

    return res.json({ success: true, message: 'Approved categories retrieved', data: categoriesWithId });
  } catch (error) {
    console.error('Admin list approved categories error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch approved categories', error: error.message });
  }
};

export const approveCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    category.status = 'approved';
    await category.save();

    await logAudit({
      action: 'admin.category.approve',
      actor_user_id: req.user.id,
      target_type: 'category',
      target_id: category.id,
      metadata: { status: 'approved' },
      ip_address: req.ip
    });

    return res.json({ 
      success: true, 
      message: 'Category approved successfully',
      data: {
        category_id: category.id,
        status: category.status
      }
    });
  } catch (error) {
    console.error('Admin approve category error:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve category', error: error.message });
  }
};

export const rejectCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { reason } = req.body; // Optional rejection reason

    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    category.status = 'rejected';
    await category.save();

    await logAudit({
      action: 'admin.category.reject',
      actor_user_id: req.user.id,
      target_type: 'category',
      target_id: category.id,
      metadata: { status: 'rejected', reason: reason || null },
      ip_address: req.ip
    });

    return res.json({ 
      success: true, 
      message: 'Category rejected successfully',
      data: {
        category_id: category.id,
        status: category.status
      }
    });
  } catch (error) {
    console.error('Admin reject category error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reject category', error: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Check if category has products
    const productCount = await Product.count({
      where: { category_id: categoryId }
    });

    if (productCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete category. It has ${productCount} product(s) associated with it. Please remove or reassign products first.` 
      });
    }

    const categoryIdForAudit = category.id;
    const categoryName = category.name;

    // Hard delete - permanently remove the category from database
    await category.destroy({ force: true });

    await logAudit({
      action: 'admin.category.delete',
      actor_user_id: req.user.id,
      target_type: 'category',
      target_id: categoryIdForAudit,
      metadata: { hard_delete: true, category_name: categoryName },
      ip_address: req.ip
    });

    return res.json({ 
      success: true, 
      message: 'Category deleted successfully' 
    });
  } catch (error) {
    console.error('Admin delete category error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete category', error: error.message });
  }
};


