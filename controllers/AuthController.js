import db from '../models/index.js';
import jwt from 'jsonwebtoken';
import { sendOtpEmail } from '../services/emailService.js';
import moment from 'moment';
import { Op } from 'sequelize';
import { logAudit } from '../utils/audit.js';

const { User, Otp, ShopInvitation } = db;

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, shop_id: user.shop_id || null, type: 'access' },
    process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
};

const sendOtp = async (user, type) => {
  // Generate a 6-digit OTP (always exactly 6 digits)
  const code = Math.floor(100000 + Math.random() * 900000).toString().padStart(6, '0');
  const identifier = user.email || user.phone_number;

  await Otp.create({
    identifier: identifier,
    token: code,
    type: type,
    expires_at: moment().add(12, 'hours').toDate()
  });

  if (user.email) {
    try {
      await sendOtpEmail(user.email, code, type);
    } catch (error) {
      console.error('Mail error:', error.message);
    }
  } else {
    console.log(`SMS Mock: OTP for ${user.phone_number} is ${code}`);
  }

  return code;
};

export const register = async (req, res) => {
  try {
    const { full_name, email, phone_number, password, invite_token } = req.body;

    if (!full_name || !password) {
      return res.status(400).json({
        success: false,
        message: 'Full name and password are required'
      });
    }

    if (!email && !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Either email or phone number is required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: email ? { email } : { phone_number }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or phone number'
      });
    }

    let invite = null;
    if (invite_token) {
      invite = await ShopInvitation.findOne({
        where: {
          token: invite_token,
          status: 'pending',
          [Op.or]: [
            { expires_at: null },
            { expires_at: { [Op.gt]: new Date() } }
          ]
        }
      });

      if (!invite) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired invitation token'
        });
      }

      const emailMatches = !!(email && invite.owner_email && invite.owner_email.toLowerCase() === email.toLowerCase());
      const phoneMatches = !!(phone_number && invite.owner_phone && invite.owner_phone === phone_number);

      // If invite specifies contact details, require the registering user to match at least one.
      if ((invite.owner_email || invite.owner_phone) && !(emailMatches || phoneMatches)) {
        return res.status(400).json({
          success: false,
          message: 'Invitation token does not match provided email/phone'
        });
      }
    }

    const user = await User.create({
      name: full_name,
      email: email || null,
      phone_number: phone_number || null,
      password: password,
      is_verified: false,
      role: invite ? 'seller' : 'customer',
      shop_id: invite ? invite.shop_id : null
    });

    if (invite) {
      invite.status = 'accepted';
      invite.accepted_by_user_id = user.id;
      await invite.save();

      await logAudit({
        action: 'seller.invitation.accept',
        actor_user_id: user.id,
        target_type: 'shop_invitation',
        target_id: invite.id,
        metadata: { shop_id: invite.shop_id },
        ip_address: req.ip
      });
    }

    const otpCode = await sendOtp(user, 'signup');

    const responseData = {
      user_id: user.id,
      email: user.email,
      phone_number: user.phone_number
    };

    if (user.phone_number && !user.email) {
      responseData.otp = otpCode;
    }

    return res.json({
      success: true,
      message: 'Registration successful. Please verify OTP.',
      data: responseData
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, phone_number, password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    if (!email && !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Either email or phone number is required'
      });
    }

    const whereClause = email ? { email } : { phone_number };
    const user = await User.findOne({ where: whereClause });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken: accessToken,
        refreshToken: refreshToken,
        sessionId: `session_${user.id}_${Date.now()}`,
        user: {
          id: `usr_${user.id}`,
          username: user.name?.split(' ')[0] || user.email?.split('@')[0] || 'user',
          email: user.email,
          phone_number: user.phone_number,
          role: user.role,
          shop_id: user.shop_id || null,
          created_at: user.createdAt || user.created_at || new Date()
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, phone_number, otp, type } = req.body;

    if (!otp || !type) {
      return res.status(400).json({
        success: false,
        message: 'OTP and type are required'
      });
    }

    // Validate that OTP is exactly 6 digits
    const otpString = otp.toString().trim();
    if (!/^\d{6}$/.test(otpString)) {
      return res.status(400).json({
        success: false,
        message: 'OTP must be exactly 6 digits'
      });
    }

    if (!email && !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Either email or phone number is required'
      });
    }

    const identifier = email || phone_number;

    const otpRecord = await Otp.findOne({
      where: {
        identifier: identifier,
        token: otpString,
        type: type,
        expires_at: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    if (type !== 'password_reset') {
      await otpRecord.destroy({ force: true });
    }

    if (type === 'signup') {
      const user = await User.findOne({
        where: {
          [Op.or]: [
            { email: identifier },
            { phone_number: identifier }
          ]
        }
      });

      if (user) {
        user.is_verified = true;
        user.email_verified_at = new Date();
        await user.save();

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        return res.json({
          success: true,
          message: 'Verification successful',
          data: {
            user: {
              id: `usr_${user.id}`,
              full_name: user.name,
              email: user.email,
              phone_number: user.phone_number,
              role: user.role,
              shop_id: user.shop_id || null,
              created_at: user.createdAt || user.created_at || new Date()
            },
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: 'Bearer',
            expires_in: 3600
          }
        });
      }
    }

    if (type === 'password_reset') {
      // Generate reset token for password reset
      const resetToken = jwt.sign(
        { identifier, type: 'password_reset' },
        process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
        { expiresIn: '1h' }
      );

      return res.json({
        success: true,
        message: 'OTP verified',
        data: {
          reset_token: resetToken
        }
      });
    }

    return res.json({
      success: true,
      message: 'OTP verified'
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'OTP verification failed',
      error: error.message
    });
  }
};

export const resendOtp = async (req, res) => {
  try {
    const { email, phone_number, type } = req.body;

    if (!email && !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Either email or phone number is required'
      });
    }

    const identifier = email || phone_number;
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: identifier },
          { phone_number: identifier }
        ]
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const otpCode = await sendOtp(user, type || 'signup');

    const responseData = {
      success: true,
      message: 'OTP sent successfully'
    };

    if (user.phone_number && !user.email) {
      responseData.otp = otpCode;
    }

    return res.json(responseData);
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resend OTP',
      error: error.message
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email, phone_number } = req.body;

    if (!email && !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Either email or phone number is required'
      });
    }

    const identifier = email || phone_number;
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: identifier },
          { phone_number: identifier }
        ]
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const otpCode = await sendOtp(user, 'password_reset');

    const responseData = {
      success: true,
      message: 'Password reset OTP sent',
      data: {
        email: user.email,
        phone_number: user.phone_number
      }
    };

    if (user.phone_number && !user.email) {
      responseData.data.otp = otpCode;
    }

    return res.json(responseData);
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send password reset OTP',
      error: error.message
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, phone_number, reset_token, new_password } = req.body;

    if (!reset_token || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required'
      });
    }

    if (!email && !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Either email or phone number is required'
      });
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(reset_token, process.env.JWT_SECRET || 'your-secret-key-change-this-in-production');
      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid token type');
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: identifier },
          { phone_number: identifier }
        ]
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.password = new_password;
    await user.save();

    return res.json({
      success: true,
      message: 'Password reset successful',
      data: null
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Password reset failed',
      error: error.message
    });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(
        refresh_token,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
      );
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    return res.json({
      success: true,
      message: 'Token refreshed',
      data: {
        access_token: accessToken,
        refresh_token: newRefreshToken,
        token_type: 'Bearer',
        expires_in: 3600
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to refresh token',
      error: error.message
    });
  }
};

export const logout = async (req, res) => {
  try {
    // In a stateless JWT system, logout is typically handled client-side
    // by removing the token. However, we can add token blacklisting here if needed.
    // For now, we'll just return success.
    
    return res.json({
      success: true,
      message: 'Logged out successfully',
      data: null
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
};

