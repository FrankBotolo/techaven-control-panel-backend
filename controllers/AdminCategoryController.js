import db from '../models/index.js';
import { logAudit } from '../utils/audit.js';

const { Category } = db;

export const listPending = async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { status: 'pending' },
      order: [['id', 'DESC']]
    });

    // Add category_id explicitly to each category
    const categoriesWithId = categories.map(cat => {
      const catData = cat.toJSON();
      return {
        ...catData,
        category_id: cat.id
      };
    });

    return res.json({ success: true, message: 'Pending categories retrieved', data: categoriesWithId });
  } catch (error) {
    console.error('Admin list pending categories error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch pending categories', error: error.message });
  }
};

export const approveCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { approved } = req.body;

    const category = await Category.findByPk(categoryId);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    category.status = approved ? 'approved' : 'rejected';
    await category.save();

    await logAudit({
      action: 'admin.category.approve',
      actor_user_id: req.user.id,
      target_type: 'category',
      target_id: category.id,
      metadata: { approved: !!approved },
      ip_address: req.ip
    });

    return res.json({ success: true, message: 'Category approved successfully' });
  } catch (error) {
    console.error('Admin approve category error:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve category', error: error.message });
  }
};


