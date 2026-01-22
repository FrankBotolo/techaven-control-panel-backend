import crypto from 'crypto';
import db from '../models/index.js';
import { sendInvitationEmail } from '../services/emailService.js';
import { logAudit } from '../utils/audit.js';

const { Shop, ShopInvitation } = db;

const generateInviteToken = () => crypto.randomBytes(32).toString('hex');

export const createShop = async (req, res) => {
  try {
    const { shop_name, location, address, phone, email, logo_url } = req.body;

    if (!shop_name) {
      return res.status(400).json({ success: false, message: 'shop_name is required' });
    }

    if (!logo_url) {
      return res.status(400).json({ success: false, message: 'logo_url is required' });
    }

    const shop = await Shop.create({
      name: shop_name,
      location: location || null,
      address: address || null,
      phone: phone || null,
      email: email || null,
      logo: logo_url
    });

    await logAudit({
      action: 'admin.shop.create',
      actor_user_id: req.user.id,
      target_type: 'shop',
      target_id: shop.id,
      metadata: { shop_name, location, address, phone, email, logo_url },
      ip_address: req.ip
    });

    return res.json({
      success: true,
      message: 'Shop created successfully',
      data: { shop_id: `shop_${String(shop.id).padStart(3, '0')}` }
    });
  } catch (error) {
    console.error('Admin create shop error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create shop', error: error.message });
  }
};

export const listShops = async (req, res) => {
  try {
    const shops = await Shop.findAll({ order: [['id', 'DESC']] });
    return res.json({ success: true, message: 'Shops retrieved', data: shops });
  } catch (error) {
    console.error('Admin list shops error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch shops', error: error.message });
  }
};

export const updateShop = async (req, res) => {
  try {
    const { shopId } = req.params;
    const shop = await Shop.findByPk(shopId);
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });

    const { shop_name, location, address, phone, email, status, logo_url } = req.body;

    if (shop_name != null) shop.name = shop_name;
    if (location != null) shop.location = location;
    if (address != null) shop.address = address;
    if (phone != null) shop.phone = phone;
    if (email != null) shop.email = email;
    if (status != null) shop.status = status;
    if (logo_url != null) shop.logo = logo_url;

    await shop.save();

    await logAudit({
      action: 'admin.shop.update',
      actor_user_id: req.user.id,
      target_type: 'shop',
      target_id: shop.id,
      metadata: { shop_name, location, address, phone, email, status, logo_url },
      ip_address: req.ip
    });

    return res.json({ success: true, message: 'Shop updated successfully', data: shop });
  } catch (error) {
    console.error('Admin update shop error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update shop', error: error.message });
  }
};

export const deleteShop = async (req, res) => {
  try {
    const { shopId } = req.params;
    const shop = await Shop.findByPk(shopId);
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });

    const shopIdForAudit = shop.id;
    const shopName = shop.name;

    // Hard delete - permanently remove the shop from database
    await shop.destroy({ force: true });

    await logAudit({
      action: 'admin.shop.delete',
      actor_user_id: req.user.id,
      target_type: 'shop',
      target_id: shopIdForAudit,
      metadata: { hard_delete: true, shop_name: shopName },
      ip_address: req.ip
    });

    return res.json({ success: true, message: 'Shop deleted successfully' });
  } catch (error) {
    console.error('Admin delete shop error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete shop', error: error.message });
  }
};

export const inviteOwner = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { owner_name, owner_email, owner_phone } = req.body;

    if (!owner_name) {
      return res.status(400).json({ success: false, message: 'owner_name is required' });
    }
    if (!owner_email && !owner_phone) {
      return res.status(400).json({ success: false, message: 'owner_email or owner_phone is required' });
    }

    const shop = await Shop.findByPk(shopId);
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });

    const token = generateInviteToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await ShopInvitation.create({
      shop_id: shop.id,
      owner_name,
      owner_email: owner_email || null,
      owner_phone: owner_phone || null,
      token,
      status: 'pending',
      invited_by_user_id: req.user.id,
      expires_at: expiresAt
    });

    const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:8000';
    const registrationLink = `${baseUrl.replace(/\/$/, '')}/register?invite_token=${token}`;

    if (owner_email) {
      await sendInvitationEmail(owner_email, {
        owner_name,
        shop_name: shop.name,
        registration_link: registrationLink
      });
    } else {
      // SMS integration can be added later
      console.log(`SMS Mock: Invite link for ${owner_phone}: ${registrationLink}`);
    }

    await logAudit({
      action: 'admin.shop.invite_owner',
      actor_user_id: req.user.id,
      target_type: 'shop_invitation',
      target_id: invite.id,
      metadata: { shop_id: shop.id, owner_name, owner_email, owner_phone },
      ip_address: req.ip
    });

    return res.json({
      success: true,
      message: 'Invitation sent successfully',
      data: { invite_id: `invite_${String(invite.id).padStart(3, '0')}`, status: invite.status }
    });
  } catch (error) {
    console.error('Admin invite owner error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send invitation', error: error.message });
  }
};


