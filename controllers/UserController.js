import db from '../models/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const memberSince = (createdAt) =>
  createdAt ? new Date(createdAt).toLocaleString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown';

export const profile = async (req, res) => {
  try {
    const user = req.user;
    return res.json({
      success: true,
      message: 'Profile retrieved',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        avatar: user.avatar_url || null,
        is_verified: user.is_verified,
        role: user.role,
        member_since: memberSince(user.createdAt || user.created_at),
        created_at: user.createdAt || user.created_at || null
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
      data: null,
      error: error.message
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, email, phone_number } = req.body;
    const user = req.user;

    if (name) user.name = name;
    if (email !== undefined) user.email = email;
    if (phone_number !== undefined) user.phone_number = phone_number;

    await user.save();

    return res.json({
      success: true,
      message: 'Profile updated',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        avatar: user.avatar_url || null,
        is_verified: user.is_verified,
        role: user.role,
        member_since: memberSince(user.createdAt || user.created_at),
        created_at: user.createdAt || user.created_at || null
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      data: null,
      error: error.message
    });
  }
};

export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const user = req.user;
    const fileUrl = `${process.env.APP_URL || 'http://localhost:8000'}/uploads/${req.file.filename}`;
    
    user.avatar_url = fileUrl;
    await user.save();

    return res.json({
      success: true,
      message: 'Avatar uploaded',
      data: { avatar: fileUrl }
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload avatar',
      error: error.message
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { current_password, new_password, new_password_confirmation } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
        data: null
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
        data: null
      });
    }

    if (new_password_confirmation !== undefined && new_password !== new_password_confirmation) {
      return res.status(400).json({
        success: false,
        message: 'New password confirmation does not match',
        data: null
      });
    }

    const user = req.user;
    const isPasswordValid = await user.comparePassword(current_password);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = new_password;
    await user.save();

    return res.json({
      success: true,
      message: 'Password changed successfully',
      data: null
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const { password, reason } = req.body;
    const user = req.user;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to delete account'
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Password is incorrect'
      });
    }

    // Soft delete or hard delete based on your requirements
    // For now, we'll just mark as deleted or actually delete
    await user.destroy();

    return res.json({
      success: true,
      message: 'Account deleted successfully',
      data: null
    });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: error.message
    });
  }
};

