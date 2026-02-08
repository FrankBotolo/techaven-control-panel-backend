import db from '../models/index.js';
import moment from 'moment';
import { Op } from 'sequelize';

const { ShopInvitation, Shop, User, Otp, sequelize } = db;

// Helper function to get or generate OTP for invitation
const getOrGenerateOtp = async (invitation) => {
  const identifier = invitation.owner_email || invitation.owner_phone;
  
  if (!identifier) {
    return null;
  }

  // Check if there's an existing valid OTP for this invitation
  const existingOtp = await Otp.findOne({
    where: {
      identifier: identifier,
      type: 'invitation',
      expires_at: {
        [Op.gt]: new Date()
      }
    },
    order: [['id', 'DESC']] // Order by id DESC to get most recent
  });

  if (existingOtp) {
    return existingOtp.token;
  }

  // Generate a new 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString().padStart(6, '0');
  
  // Create OTP record
  await Otp.create({
    identifier: identifier,
    token: code,
    type: 'invitation',
    expires_at: moment().add(7, 'days').toDate() // 7 days expiry for invitations
  });

  return code;
};

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
      attributes: [
        'id',
        'shop_id',
        'owner_name',
        'owner_email',
        'owner_phone',
        'token',
        'status',
        'invited_by_user_id',
        'accepted_by_user_id',
        'expires_at',
        'created_at',
        'updated_at'
      ],
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
      order: [['id', 'DESC']]
    });

    // Add OTP to each invitation
    const invitationsWithOtp = await Promise.all(
      invitations.map(async (invitation) => {
        const invitationData = invitation.toJSON();
        const otp = await getOrGenerateOtp(invitation);
        invitationData.otp = otp;
        return invitationData;
      })
    );

    return res.json({
      status: 'success',
      data: invitationsWithOtp
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
      attributes: [
        'id',
        'shop_id',
        'owner_name',
        'owner_email',
        'owner_phone',
        'token',
        'status',
        'invited_by_user_id',
        'accepted_by_user_id',
        'expires_at',
        'created_at',
        'updated_at'
      ],
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

    // Add OTP to invitation
    const invitationData = invitation.toJSON();
    const otp = await getOrGenerateOtp(invitation);
    invitationData.otp = otp;

    return res.json({
      status: 'success',
      data: invitationData
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

