import db from '../models/index.js';
import jwt from 'jsonwebtoken';
import { sendOtpEmail } from '../services/emailService.js';
import { sendOtpSms, sendPasswordResetOtpSms } from '../services/smsService.js';
import moment from 'moment';
import { Op } from 'sequelize';
import { logAudit } from '../utils/audit.js';

const { User, Otp, ShopInvitation, Shop } = db;

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
  // Generate a 4-digit OTP (per API doc: always 4 digits, 12-hour expiry)
  const code = Math.floor(1000 + Math.random() * 9000).toString();
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
  }
  if (user.phone_number) {
    try {
      if (type === 'password_reset') {
        await sendPasswordResetOtpSms(user.phone_number, code);
      } else {
        await sendOtpSms(user.phone_number, code);
      }
    } catch (error) {
      console.error('SMS error:', error.message);
    }
  }

  return code;
};

export const registerSeller = async (req, res) => {
  try {
    const {
      full_name,
      email,
      phone_number,
      password,
      shop_name,
      location,
      address
    } = req.body;

    if (!full_name || !password || !shop_name) {
      return res.status(400).json({
        success: false,
        message: 'full_name, password, and shop_name are required'
      });
    }

    if (!email && !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Either email or phone_number is required'
      });
    }

    const existingUser = await User.findOne({
      where: email ? { email } : { phone_number }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or phone number'
      });
    }

    const logoFile = req.files?.logo?.[0] || null;
    const businessLicenseFile = req.files?.business_license?.[0] || null;
    const idDocumentsFiles = req.files?.id_document || [];

    const baseUrl = process.env.APP_URL || 'http://localhost:8000';
    const fileUrl = (file) =>
      file ? `${baseUrl}/uploads/${file.filename}` : null;

    // Prefer uploaded files when present, otherwise allow direct URLs from JSON body
    const logoUrl = logoFile ? fileUrl(logoFile) : (req.body.logo_url || null);
    const businessLicenseUrl = businessLicenseFile
      ? fileUrl(businessLicenseFile)
      : (req.body.business_license_url || null);

    let idDocumentUrls = [];
    if (idDocumentsFiles.length > 0) {
      idDocumentUrls = idDocumentsFiles.map((file) => fileUrl(file));
    } else if (req.body.id_document_urls) {
      if (Array.isArray(req.body.id_document_urls)) {
        idDocumentUrls = req.body.id_document_urls;
      } else {
        // Support single string or comma-separated list
        idDocumentUrls = String(req.body.id_document_urls)
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean);
      }
    }

    if (!logoUrl || !businessLicenseUrl || idDocumentUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Logo, business licence, and at least one ID document are required (either upload files or provide URLs).'
      });
    }

    const shop = await Shop.create({
      name: shop_name,
      location: location || null,
      address: address || null,
      phone: phone_number || null,
      email: email || null,
      logo: logoUrl,
      status: 'inactive',
      application_status: 'pending',
      is_verified: false,
      business_license_url: businessLicenseUrl,
      verification_documents: {
        business_license_url: businessLicenseUrl,
        id_documents: idDocumentUrls
      }
    });

    const user = await User.create({
      name: full_name,
      email: email || null,
      phone_number: phone_number || null,
      password: password,
      is_verified: false,
      role: 'seller',
      shop_id: shop.id
    });

    await logAudit({
      action: 'seller.self_registration.request',
      actor_user_id: user.id,
      target_type: 'shop',
      target_id: shop.id,
      metadata: {
        shop_name,
        location,
        address,
        phone_number,
        email
      },
      ip_address: req.ip
    });

    const otpCode = await sendOtp(user, 'signup');

    const responseData = {
      user_id: user.id,
      email: user.email,
      phone_number: user.phone_number,
      shop_id: shop.id
    };

    if (user.phone_number && !user.email) {
      responseData.otp = otpCode;
    }

    return res.json({
      success: true,
      message: 'Seller registration submitted. Please verify OTP and wait for admin approval.',
      data: responseData
    });
  } catch (error) {
    console.error('Register seller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Seller registration failed',
      error: error.message
    });
  }
};

export const register = async (req, res) => {
  try {
    const { full_name, email, phone_number, password, invite_token } = req.body;

    // Validate invitation token FIRST if provided (only checked during registration)
    let invite = null;
    if (invite_token) {
      // Token validation - only happens in register endpoint
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

      // If invitation has specific email/phone, validate it matches registration data
      const emailMatches = !!(email && invite.owner_email && invite.owner_email.toLowerCase() === email.toLowerCase());
      const phoneMatches = !!(phone_number && invite.owner_phone && invite.owner_phone === phone_number);

      // If invite specifies contact details, require the registering user to match at least one
      if ((invite.owner_email || invite.owner_phone) && !(emailMatches || phoneMatches)) {
        return res.status(400).json({
          success: false,
          message: 'Invitation token does not match provided email/phone'
        });
      }
    }

    // Standard registration validation
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
        message: 'Invalid credentials',
        data: null
      });
    }

    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        message: 'Account not verified. Please verify your email or phone with OTP first.',
        data: null
      });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        data: null
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const memberSince = user.createdAt
      ? new Date(user.createdAt).toLocaleString('en-US', { month: 'long', year: 'numeric' })
      : 'Unknown';

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        access_token: accessToken,
        token_type: 'Bearer',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone_number: user.phone_number,
          avatar: user.avatar_url || null,
          is_verified: user.is_verified,
          role: user.role,
          member_since: memberSince,
          created_at: user.createdAt || user.created_at || new Date()
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed',
      data: null,
      error: error.message
    });
  }
};

/** Send OTP for OTP-based login (default login in app). Only for verified users. */
export const sendLoginOtp = async (req, res) => {
  try {
    const { email, phone_number } = req.body;
    if (!email && !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Either email or phone number is required',
        data: null
      });
    }
    const whereClause = email ? { email } : { phone_number };
    const user = await User.findOne({ where: whereClause });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        data: null
      });
    }
    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        message: 'Account not verified. Please complete signup verification first.',
        data: null
      });
    }
    await sendOtp(user, 'login');
    return res.json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        email: user.email || null,
        phone_number: user.phone_number || null
      }
    });
  } catch (error) {
    console.error('Send login OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send login OTP',
      data: null,
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

    // Validate that OTP is exactly 4 digits (per API doc)
    const otpString = otp.toString().trim();
    if (!/^\d{4}$/.test(otpString)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
        data: null
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
        message: 'Invalid or expired OTP',
        data: null
      });
    }

    if (type !== 'password_reset') {
      await otpRecord.destroy({ force: true });
    }

    const formatUserForAuth = (u) => {
      const memberSince = u.createdAt
        ? new Date(u.createdAt).toLocaleString('en-US', { month: 'long', year: 'numeric' })
        : 'Unknown';
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone_number: u.phone_number,
        avatar: u.avatar_url || null,
        is_verified: u.is_verified,
        role: u.role,
        member_since: memberSince,
        created_at: u.createdAt || u.created_at || new Date()
      };
    };

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
        return res.json({
          success: true,
          message: 'Login successful',
          data: {
            user: formatUserForAuth(user),
            access_token: accessToken,
            token_type: 'Bearer'
          }
        });
      }
    }

    if (type === 'login') {
      const user = await User.findOne({
        where: {
          [Op.or]: [
            { email: identifier },
            { phone_number: identifier }
          ]
        }
      });
      if (user) {
        const accessToken = generateAccessToken(user);
        return res.json({
          success: true,
          message: 'Login successful',
          data: {
            user: formatUserForAuth(user),
            access_token: accessToken,
            token_type: 'Bearer'
          }
        });
      }
    }

    if (type === 'password_reset') {
      return res.json({
        success: true,
        message: 'OTP verified',
        data: null
      });
    }

    return res.json({
      success: true,
      message: 'OTP verified',
      data: null
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

    const validTypes = ['signup', 'login', 'password_reset'];
    const otpType = validTypes.includes(type) ? type : 'signup';
    await sendOtp(user, otpType);

    return res.json({
      success: true,
      message: 'OTP sent successfully',
      data: null
    });
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
    const { email, phone_number, otp, new_password } = req.body;

    if (!otp || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'OTP and new password are required',
        data: null
      });
    }

    if (!email && !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Either email or phone number is required',
        data: null
      });
    }

    const identifier = email || phone_number;
    const otpString = otp.toString().trim();
    if (!/^\d{4}$/.test(otpString)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
        data: null
      });
    }

    const otpRecord = await Otp.findOne({
      where: {
        identifier,
        token: otpString,
        type: 'password_reset',
        expires_at: { [Op.gt]: new Date() }
      }
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
        data: null
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
        message: 'User not found',
        data: null
      });
    }

    user.password = new_password;
    await user.save();
    await otpRecord.destroy({ force: true });

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
      data: null,
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

