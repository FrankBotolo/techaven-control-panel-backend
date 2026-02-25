import jwt from 'jsonwebtoken';
import db from '../models/index.js';

const { User, Shop } = db;

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. No token provided.'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this-in-production');
    
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden'
      });
    }

    return next();
  };
};

export const requireApprovedSeller = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    if (req.user.role !== 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden'
      });
    }

    if (!req.user.is_verified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your account before accessing seller features'
      });
    }

    if (!req.user.shop_id) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to any shop'
      });
    }

    const shop = await Shop.findByPk(req.user.shop_id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found'
      });
    }

    if (shop.application_status !== 'approved' || shop.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your shop is pending admin approval'
      });
    }

    return next();
  } catch (error) {
    console.error('requireApprovedSeller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to validate seller approval status'
    });
  }
};

export const requireShopOwnerForShopParam = (shopParamKey = 'shopId') => {
  return (req, res, next) => {
    const shopId = parseInt(req.params[shopParamKey], 10);
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!shopId || Number.isNaN(shopId)) {
      return res.status(400).json({ success: false, message: 'Invalid shop id' });
    }
    if (req.user.role !== 'seller') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    if (!req.user.shop_id || req.user.shop_id !== shopId) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this shop' });
    }
    return next();
  };
};

