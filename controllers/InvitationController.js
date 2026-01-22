import db from '../models/index.js';

const { ShopInvitation, Shop, User, sequelize } = db;

export const index = async (req, res) => {
  try {
    const { shopId, status, userId } = req.query;
    const user = req.user;

    // Build where clause
    const where = {};

    // Admin can see all invites
    // Sellers can see invites for their shop
    // Regular users can see invites they sent or accepted
    if (user.role === 'admin') {
      // Admin can filter by shopId, status, or userId
      if (shopId) {
        where.shop_id = parseInt(shopId, 10);
      }
      if (status) {
        where.status = status;
      }
      if (userId) {
        where.invited_by_user_id = parseInt(userId, 10);
      }
    } else if (user.role === 'seller') {
      // Sellers can only see invites for their shop
      if (!user.shop_id) {
        return res.status(403).json({
          status: 'error',
          message: 'You are not assigned to any shop'
        });
      }
      where.shop_id = user.shop_id;
      
      if (status) {
        where.status = status;
      }
    } else {
      // Regular users can see invites they sent or accepted
      where.invited_by_user_id = user.id;
      if (status) {
        where.status = status;
      }
    }

    const invitations = await ShopInvitation.findAll({
      where,
      include: [
        {
          model: Shop,
          as: 'shop',
          attributes: ['id', 'name', 'logo', 'status']
        },
        {
          model: User,
          as: 'invited_by',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'accepted_by',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [[sequelize.literal('ShopInvitation.created_at'), 'DESC']]
    });

    return res.json({
      status: 'success',
      data: invitations
    });
  } catch (error) {
    console.error('Invitations index error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch invitations',
      error: error.message
    });
  }
};

export const show = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const invitation = await ShopInvitation.findByPk(id, {
      include: [
        {
          model: Shop,
          as: 'shop',
          attributes: ['id', 'name', 'logo', 'status']
        },
        {
          model: User,
          as: 'invited_by',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'accepted_by',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!invitation) {
      return res.status(404).json({
        status: 'error',
        message: 'Invitation not found'
      });
    }

    // Check authorization
    if (user.role === 'seller') {
      if (!user.shop_id || user.shop_id !== invitation.shop_id) {
        return res.status(403).json({
          status: 'error',
          message: 'You are not authorized to view this invitation'
        });
      }
    } else if (user.role === 'customer') {
      if (invitation.invited_by_user_id !== user.id && invitation.accepted_by_user_id !== user.id) {
        return res.status(403).json({
          status: 'error',
          message: 'You are not authorized to view this invitation'
        });
      }
    }
    // Admin can view any invitation

    return res.json({
      status: 'success',
      data: invitation
    });
  } catch (error) {
    console.error('Invitation show error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch invitation',
      error: error.message
    });
  }
};

