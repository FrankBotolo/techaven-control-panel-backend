import crypto from 'crypto';
import db from '../models/index.js';
import { sendInvitationEmail } from '../services/emailService.js';
import { sendInvitationSms } from '../services/smsService.js';
import { logAudit, auditContext } from '../utils/audit.js';
import { enqueueShop, enqueueShopDevices, enqueueTombstone } from '../services/catalogue/promotionSync.js';

const { Shop, ShopInvitation } = db;

const generateInviteToken = () => crypto.randomBytes(32).toString('hex');

/**
 * Shop fields an admin can set. Empty strings clear optional fields. Returns { values } or { error }.
 * `partial` (update) leaves missing fields untouched; create requires a name.
 */
function shopFields(body, { partial }) {
  const values = {};
  const text = (key, column, max, { required = false } = {}) => {
    const raw = body[key];
    if (raw === undefined) {
      if (required && !partial) return `${key} is required`;
      return null;
    }
    if (raw !== null && typeof raw !== 'string') return `${key} must be text`;
    const value = (raw ?? '').trim();
    if (required && !value) return `${key} is required`;
    if (value.length > max) return `${key} must be at most ${max} characters`;
    values[column] = value || null;
    return null;
  };
  const errors = [
    text('shop_name', 'name', 255, { required: true }),
    text('location', 'location', 255),
    text('address', 'address', 255),
    text('phone', 'phone', 50),
    text('email', 'email', 255),
    text('description', 'description', 5000),
    text('logo_url', 'logo', 2048)
  ].filter(Boolean);
  if (errors.length) return { error: errors[0] };
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return { error: 'Enter a valid email address' };
  if (values.logo && !/^https?:\/\//i.test(values.logo)) return { error: 'logo_url must be a web address' };
  if (body.status !== undefined) {
    if (!['active', 'inactive'].includes(body.status)) return { error: 'status must be active or inactive' };
    values.status = body.status;
  }
  if (body.is_verified !== undefined) values.is_verified = body.is_verified === true || body.is_verified === 'true';
  return { values };
}

const shopDto = (shop) => {
  const plain = shop.get ? shop.get({ plain: true }) : shop;
  const { users, ...rest } = plain;
  return { ...rest, owners: (users || []).map((user) => ({ id: user.id, name: user.name, email: user.email })) };
};

export const createShop = async (req, res) => {
  try {
    const { values, error } = shopFields(req.body, { partial: false });
    if (error) return res.status(400).json({ success: false, message: error });

    // Shops added by an admin are live straight away; applications from sellers go through review.
    const shop = await Shop.create({ status: 'active', application_status: 'approved', ...values });
    await enqueueShop(shop.id, { reason: `admin-create:${shop.updatedAt.toISOString()}` });

    await logAudit({
      ...auditContext(req),
      action: 'admin.shop.create',
      actor_user_id: req.user.id,
      target_type: 'shop',
      target_id: shop.id,
      metadata: values
    });

    return res.status(201).json({
      success: true,
      message: 'Shop created successfully',
      data: { ...shopDto(shop), shop_id: `shop_${String(shop.id).padStart(3, '0')}` }
    });
  } catch (error) {
    console.error('Admin create shop error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create shop' });
  }
};

export const listShops = async (req, res) => {
  try {
    const { status, application_status } = req.query;

    const where = {};
    if (status) {
      where.status = status;
    }
    if (application_status) {
      where.application_status = application_status;
    }

    const shops = await Shop.findAll({
      where,
      include: [{ model: db.User, as: 'users', attributes: ['id', 'name', 'email'], where: { role: 'seller' }, required: false }],
      order: [['id', 'DESC']]
    });
    return res.json({ success: true, message: 'Shops retrieved', data: shops.map(shopDto) });
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

    const { values, error } = shopFields(req.body, { partial: true });
    if (error) return res.status(400).json({ success: false, message: error });
    if (!Object.keys(values).length) return res.status(400).json({ success: false, message: 'Nothing to update' });

    await shop.update(values);
    await enqueueShop(shop.id, { reason: `admin-update:${shop.updatedAt.toISOString()}` });
    await enqueueShopDevices(shop.id, { reason: `admin-update:${shop.updatedAt.toISOString()}` });

    await logAudit({
      ...auditContext(req),
      action: 'admin.shop.update',
      actor_user_id: req.user.id,
      target_type: 'shop',
      target_id: shop.id,
      metadata: values
    });

    return res.json({ success: true, message: 'Shop updated successfully', data: shopDto(shop) });
  } catch (error) {
    console.error('Admin update shop error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update shop' });
  }
};

export const approveShopApplication = async (req, res) => {
  try {
    const { shopId } = req.params;
    const shop = await Shop.findByPk(shopId);

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    shop.application_status = 'approved';
    shop.status = 'active';
    shop.is_verified = true;

    await shop.save();
    await enqueueShop(shop.id, { reason: `admin-approve:${shop.updatedAt.toISOString()}` });
    await enqueueShopDevices(shop.id, { reason: `admin-approve:${shop.updatedAt.toISOString()}` });

    await logAudit({
      ...auditContext(req),
      action: 'admin.shop.application.approve',
      actor_user_id: req.user.id,
      target_type: 'shop',
      target_id: shop.id,
      metadata: { application_status: 'approved' }
    });

    return res.json({
      success: true,
      message: 'Shop application approved successfully',
      data: shop
    });
  } catch (error) {
    console.error('Admin approve shop application error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to approve shop application',
      error: error.message
    });
  }
};

export const rejectShopApplication = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { reason } = req.body;

    const shop = await Shop.findByPk(shopId);

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    shop.application_status = 'rejected';
    shop.status = 'inactive';

    await shop.save();
    await enqueueShop(shop.id, { reason: `admin-reject:${shop.updatedAt.toISOString()}` });
    await enqueueShopDevices(shop.id, { reason: `admin-reject:${shop.updatedAt.toISOString()}` });

    await logAudit({
      ...auditContext(req),
      action: 'admin.shop.application.reject',
      actor_user_id: req.user.id,
      target_type: 'shop',
      target_id: shop.id,
      metadata: { application_status: 'rejected', reason: reason || null }
    });

    return res.json({
      success: true,
      message: 'Shop application rejected successfully',
      data: shop
    });
  } catch (error) {
    console.error('Admin reject shop application error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reject shop application',
      error: error.message
    });
  }
};

/**
 * Deletes a shop only when nothing depends on it (e.g. one created by mistake). A shop with sellers,
 * listings, products, orders or subscriptions is refused with 409: deleting it would erase listings and
 * history through database cascades, so suspend it instead.
 */
export const deleteShop = async (req, res) => {
  try {
    const { shopId } = req.params;
    const shop = await Shop.findByPk(shopId);
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });

    const [[usage]] = await db.sequelize.query(
      `SELECT
         (SELECT COUNT(*) FROM users WHERE shop_id = :id) sellers,
         (SELECT COUNT(*) FROM seller_listings WHERE shop_id = :id) listings,
         (SELECT COUNT(*) FROM products WHERE shop_id = :id) products,
         (SELECT COUNT(*) FROM shop_subscriptions WHERE shop_id = :id) subscriptions,
         (SELECT COUNT(*) FROM orders o JOIN users u ON u.id = o.seller_id WHERE u.shop_id = :id) orders`,
      { replacements: { id: shop.id } }
    );
    const blockers = Object.entries(usage).filter(([, count]) => Number(count) > 0).map(([name, count]) => `${count} ${name}`);
    if (blockers.length) {
      return res.status(409).json({
        success: false,
        message: `This shop has ${blockers.join(', ')}. Suspend it instead so its history is kept.`,
        data: { usage }
      });
    }

    const shopIdForAudit = shop.id;
    const shopName = shop.name;
    await db.sequelize.transaction(async (transaction) => {
      await db.ShopFollow.destroy({ where: { shop_id: shop.id }, transaction });
      await ShopInvitation.destroy({ where: { shop_id: shop.id }, transaction });
      await shop.destroy({ force: true, transaction });
    });
    await enqueueTombstone('shop', shopIdForAudit, { name: shopName }, { reason: `admin-delete:${new Date().toISOString()}` });

    await logAudit({
      ...auditContext(req),
      action: 'admin.shop.delete',
      actor_user_id: req.user.id,
      target_type: 'shop',
      target_id: shopIdForAudit,
      metadata: { hard_delete: true, shop_name: shopName }
    });

    return res.json({ success: true, message: 'Shop deleted successfully' });
  } catch (error) {
    console.error('Admin delete shop error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete shop' });
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

    let emailed = false;
    let texted = false;
    if (owner_email) {
      emailed = await sendInvitationEmail(owner_email, {
        owner_name,
        shop_name: shop.name,
        registration_link: registrationLink
      });
    }
    if (owner_phone) {
      texted = (await sendInvitationSms(owner_phone, shop.name, registrationLink)).success;
    }

    await logAudit({
      ...auditContext(req),
      action: 'admin.shop.invite_owner',
      actor_user_id: req.user.id,
      target_type: 'shop_invitation',
      target_id: invite.id,
      metadata: { shop_id: shop.id, owner_name, owner_email, owner_phone }
    });

    return res.json({
      success: true,
      message: emailed || texted ? 'Invitation sent successfully' : 'Invitation created, but it could not be delivered by email or SMS',
      data: { sent_by_email: Boolean(emailed), sent_by_sms: texted, invite_id: `invite_${String(invite.id).padStart(3, '0')}`, status: invite.status }
    });
  } catch (error) {
    console.error('Admin invite owner error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send invitation', error: error.message });
  }
};

