import db from '../models/index.js';
import { Op } from 'sequelize';
import { logAudit } from '../utils/audit.js';

const { User, Shop, Product, Order, OrderItem } = db;

const userAttributes = [
  'id', 'role', 'shop_id', 'name', 'email', 'phone_number', 'avatar_url',
  'date_of_birth', 'gender', 'is_verified', 'is_active', 'email_verified_at',
  'createdAt', 'updatedAt'
];

/** Strip password and format user for response */
const toSafeUser = (user) => {
  if (!user) return null;
  const u = user.get ? user.get({ plain: true }) : user;
  const { password, ...rest } = u;
  return rest;
};

/**
 * GET /api/admin/users
 * List all users with pagination and filters. Admin only.
 */
export const listUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search, is_active } = req.query;
    const where = {};

    if (role && ['customer', 'seller', 'admin', 'delivery_agent'].includes(role)) {
      where.role = role;
    }
    if (is_active !== undefined && is_active !== '') {
      where.is_active = is_active === 'true' || is_active === '1';
    }
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.like]: term } },
        { email: { [Op.like]: term } },
        { phone_number: { [Op.like]: term } }
      ];
    }

    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(100, Math.max(1, parseInt(limit)));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: userAttributes,
      include: [
        { model: Shop, as: 'shop', required: false, attributes: ['id', 'name', 'status', 'application_status'] }
      ],
      order: [['id', 'DESC']],
      limit: limitNum,
      offset
    });

    const users = rows.map(toSafeUser);

    return res.json({
      success: true,
      message: 'Users retrieved',
      data: {
        users,
        pagination: {
          page: Math.max(1, parseInt(page)),
          limit: limitNum,
          total_items: count,
          total_pages: Math.ceil(count / limitNum) || 1
        }
      }
    });
  } catch (error) {
    console.error('Admin list users error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/users/:id
 * Get single user with shop, orders (as buyer), and products (as seller). Admin only.
 */
export const getUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const user = await User.findByPk(userId, {
      attributes: userAttributes,
      include: [
        {
          model: Shop,
          as: 'shop',
          required: false,
          include: [
            { model: Product, as: 'products', attributes: ['id', 'name', 'price', 'stock', 'image', 'createdAt'] }
          ]
        },
        {
          model: Order,
          as: 'orders',
          required: false,
          attributes: ['id', 'order_number', 'status', 'payment_status', 'total_amount', 'createdAt'],
          include: [
            { model: OrderItem, as: 'items', attributes: ['id', 'product_name', 'quantity', 'price', 'subtotal'] }
          ],
          order: [['id', 'DESC']],
          limit: 50
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // If seller, also get orders where they are the seller (orders they're fulfilling)
    let ordersAsSeller = [];
    if (user.role === 'seller' && user.shop_id) {
      const sellerOrders = await Order.findAll({
        where: { seller_id: userId },
        attributes: ['id', 'order_number', 'status', 'payment_status', 'total_amount', 'createdAt'],
        include: [
          { model: OrderItem, as: 'items', attributes: ['id', 'product_name', 'quantity', 'price', 'subtotal'] },
          { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone_number'] }
        ],
        order: [['id', 'DESC']],
        limit: 50
      });
      ordersAsSeller = sellerOrders;
    }

    const data = toSafeUser(user);
    data.shop = user.shop ? user.shop.get({ plain: true }) : null;
    data.orders_as_buyer = (user.orders || []).map(o => o.get({ plain: true }));
    data.orders_as_seller = ordersAsSeller.map(o => o.get({ plain: true }));

    return res.json({
      success: true,
      message: 'User retrieved',
      data
    });
  } catch (error) {
    console.error('Admin get user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
};

/**
 * PATCH /api/admin/users/:id
 * Update user (name, email, phone, role, is_verified, is_active, optional password). Admin only.
 */
export const updateUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const allowed = ['name', 'email', 'phone_number', 'role', 'is_verified', 'is_active', 'avatar_url', 'date_of_birth', 'gender'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'role' && !['customer', 'seller', 'admin', 'delivery_agent'].includes(req.body[key])) continue;
        if (key === 'is_verified' || key === 'is_active') {
          updates[key] = !!req.body[key];
        } else {
          updates[key] = req.body[key];
        }
      }
    }
    if (req.body.password && String(req.body.password).length >= 6) {
      updates.password = req.body.password;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    await user.update(updates);

    await logAudit({
      action: 'admin.user.update',
      actor_user_id: req.user.id,
      target_type: 'user',
      target_id: user.id,
      metadata: { updated_fields: Object.keys(updates).filter(k => k !== 'password') },
      ip_address: req.ip
    });

    return res.json({
      success: true,
      message: 'User updated successfully',
      data: toSafeUser(await User.findByPk(user.id, { attributes: userAttributes }))
    });
  } catch (error) {
    console.error('Admin update user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
};

/**
 * DELETE /api/admin/users/:id
 * Delete user. Cannot delete self or the last admin. Admin only.
 */
export const deleteUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin') {
      const adminCount = await User.count({ where: { role: 'admin' } });
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot delete the last admin user' });
      }
    }

    await user.destroy();

    await logAudit({
      action: 'admin.user.delete',
      actor_user_id: req.user.id,
      target_type: 'user',
      target_id: userId,
      metadata: { deleted_email: user.email, deleted_role: user.role },
      ip_address: req.ip
    });

    return res.json({
      success: true,
      message: 'User deleted successfully',
      data: null
    });
  } catch (error) {
    console.error('Admin delete user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

/**
 * PATCH /api/admin/users/:id/activate
 * Set user is_active = true. Admin only.
 */
export const activateUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await user.update({ is_active: true });

    await logAudit({
      action: 'admin.user.activate',
      actor_user_id: req.user.id,
      target_type: 'user',
      target_id: user.id,
      metadata: {},
      ip_address: req.ip
    });

    return res.json({
      success: true,
      message: 'User activated successfully',
      data: toSafeUser(await User.findByPk(user.id, { attributes: userAttributes }))
    });
  } catch (error) {
    console.error('Admin activate user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to activate user',
      error: error.message
    });
  }
};

/**
 * PATCH /api/admin/users/:id/deactivate
 * Set user is_active = false. Admin only. Cannot deactivate self.
 */
export const deactivateUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await user.update({ is_active: false });

    await logAudit({
      action: 'admin.user.deactivate',
      actor_user_id: req.user.id,
      target_type: 'user',
      target_id: user.id,
      metadata: {},
      ip_address: req.ip
    });

    return res.json({
      success: true,
      message: 'User deactivated successfully',
      data: toSafeUser(await User.findByPk(user.id, { attributes: userAttributes }))
    });
  } catch (error) {
    console.error('Admin deactivate user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to deactivate user',
      error: error.message
    });
  }
};
