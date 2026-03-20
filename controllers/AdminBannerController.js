import db from '../models/index.js';
import { logAudit, auditContext } from '../utils/audit.js';

const { Banner } = db;

/** List all banners (admin only). */
export const list = async (req, res) => {
  try {
    const banners = await Banner.findAll({
      order: [['id', 'ASC']]
    });

    const formatted = (banners || []).map((b) => ({
      id: b.id,
      title: b.title || null,
      image: b.image,
      product_id: b.product_id || null,
      created_at: b.createdAt,
      updated_at: b.updatedAt
    }));

    return res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error('Admin list banners error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch banners',
      error: error.message
    });
  }
};

/** Get a single banner by id (admin only). */
export const getOne = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findByPk(id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    return res.json({
      success: true,
      data: {
        id: banner.id,
        title: banner.title || null,
        image: banner.image,
        product_id: banner.product_id || null,
        created_at: banner.createdAt,
        updated_at: banner.updatedAt
      }
    });
  } catch (error) {
    console.error('Admin get banner error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch banner',
      error: error.message
    });
  }
};

/** Create a new banner (admin only). */
export const create = async (req, res) => {
  try {
    const { title, image, product_id } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'image is required'
      });
    }

    const banner = await Banner.create({
      title: title || null,
      image,
      product_id: product_id || null
    });

    await logAudit({
      ...auditContext(req),
      action: 'admin.banner.create',
      actor_user_id: req.user.id,
      target_type: 'banner',
      target_id: banner.id,
      metadata: { title: banner.title }
    });

    return res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      data: {
        id: banner.id,
        title: banner.title || null,
        image: banner.image,
        product_id: banner.product_id || null,
        created_at: banner.createdAt,
        updated_at: banner.updatedAt
      }
    });
  } catch (error) {
    console.error('Admin create banner error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create banner',
      error: error.message
    });
  }
};

/** Update a banner (admin only). */
export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, image, product_id } = req.body;

    const banner = await Banner.findByPk(id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    if (title !== undefined) banner.title = title || null;
    if (image != null) banner.image = image;
    if (product_id !== undefined) banner.product_id = product_id || null;

    await banner.save();

    await logAudit({
      ...auditContext(req),
      action: 'admin.banner.update',
      actor_user_id: req.user.id,
      target_type: 'banner',
      target_id: banner.id,
      metadata: { title: banner.title }
    });

    return res.json({
      success: true,
      message: 'Banner updated successfully',
      data: {
        id: banner.id,
        title: banner.title || null,
        image: banner.image,
        product_id: banner.product_id || null,
        created_at: banner.createdAt,
        updated_at: banner.updatedAt
      }
    });
  } catch (error) {
    console.error('Admin update banner error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update banner',
      error: error.message
    });
  }
};

/** Delete a banner (admin only). */
export const remove = async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findByPk(id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    const bannerTitle = banner.title;
    await banner.destroy();

    await logAudit({
      ...auditContext(req),
      action: 'admin.banner.delete',
      actor_user_id: req.user.id,
      target_type: 'banner',
      target_id: id,
      metadata: { title: bannerTitle }
    });

    return res.json({
      success: true,
      message: 'Banner deleted successfully'
    });
  } catch (error) {
    console.error('Admin delete banner error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete banner',
      error: error.message
    });
  }
};
