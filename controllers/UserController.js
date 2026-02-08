import db from '../models/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const profile = async (req, res) => {
  try {
    const user = req.user;
    return res.json({
      success: true,
      message: 'Profile retrieved',
      data: {
        id: `usr_${user.id}`,
        full_name: user.name,
        email: user.email,
        phone: user.phone_number,
        avatar_url: user.avatar_url,
        date_of_birth: user.date_of_birth,
        gender: user.gender,
        created_at: user.createdAt || user.created_at || null,
        updated_at: user.updatedAt || user.updated_at || null
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
      error: error.message
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { full_name, phone, date_of_birth, gender } = req.body;
    const user = req.user;

    // Update user fields
    if (full_name) user.name = full_name;
    if (phone) user.phone_number = phone;
    if (date_of_birth) user.date_of_birth = date_of_birth;
    if (gender && ['male', 'female', 'other'].includes(gender)) {
      user.gender = gender;
    }

    await user.save();

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: `usr_${user.id}`,
        full_name: user.name,
        email: user.email,
        phone: user.phone_number,
        avatar_url: user.avatar_url,
        date_of_birth: user.date_of_birth,
        gender: user.gender,
        updated_at: user.updatedAt || user.updated_at || null
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile',
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
      message: 'Avatar uploaded successfully',
      data: { avatar_url: fileUrl }
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
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
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

