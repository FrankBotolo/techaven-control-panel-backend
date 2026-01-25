import db from '../models/index.js';
import { Op } from 'sequelize';

const { User, Shop } = db;

export const listUsers = async (req, res) => {
  try {
    const { role, shop_id, is_verified, search } = req.query;

    // Build where clause
    const where = {};

    // Filter by role
    if (role && ['admin', 'seller', 'customer'].includes(role)) {
      where.role = role;
    }

    // Filter by shop_id
    if (shop_id) {
      where.shop_id = parseInt(shop_id, 10);
    }

    // Filter by verification status
    if (is_verified !== undefined) {
      where.is_verified = is_verified === 'true' || is_verified === true;
    }

    // Search by name, email, or phone_number
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone_number: { [Op.like]: `%${search}%` } }
      ];
    }

    const users = await User.findAll({
      where,
      include: [
        {
          model: Shop,
          as: 'shop',
          attributes: ['id', 'name', 'logo', 'status'],
          required: false
        }
      ],
      attributes: {
        exclude: ['password', 'remember_token']
      },
      order: [['id', 'DESC']]
    });

    // Format response - exclude sensitive data
    const usersData = users.map(user => {
      const userData = user.toJSON();
      return {
        ...userData,
        shop: userData.shop || null
      };
    });

    return res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: usersData,
      count: usersData.length
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

export const getUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      include: [
        {
          model: Shop,
          as: 'shop',
          attributes: ['id', 'name', 'logo', 'status', 'location', 'address', 'phone', 'email'],
          required: false
        }
      ],
      attributes: {
        exclude: ['password', 'remember_token']
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.json({
      success: true,
      message: 'User retrieved successfully',
      data: user
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

