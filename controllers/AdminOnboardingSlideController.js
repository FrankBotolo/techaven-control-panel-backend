import db from '../models/index.js';

const { OnboardingSlide } = db;

/** List all onboarding slides (admin only). */
export const list = async (req, res) => {
  try {
    const slides = await OnboardingSlide.findAll({
      order: [['order_index', 'ASC'], ['id', 'ASC']]
    });

    const formatted = (slides || []).map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description || null,
      image_url: s.image_url,
      order_index: s.order_index,
      is_active: s.is_active,
      created_at: s.createdAt,
      updated_at: s.updatedAt
    }));

    return res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error('Admin list onboarding slides error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch onboarding slides',
      error: error.message
    });
  }
};

/** Get a single slide by id (admin only). */
export const getOne = async (req, res) => {
  try {
    const { id } = req.params;
    const slide = await OnboardingSlide.findByPk(id);

    if (!slide) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding slide not found'
      });
    }

    return res.json({
      success: true,
      data: {
        id: slide.id,
        title: slide.title,
        description: slide.description || null,
        image_url: slide.image_url,
        order_index: slide.order_index,
        is_active: slide.is_active,
        created_at: slide.createdAt,
        updated_at: slide.updatedAt
      }
    });
  } catch (error) {
    console.error('Admin get onboarding slide error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch onboarding slide',
      error: error.message
    });
  }
};

/** Create a new onboarding slide (admin only). */
export const create = async (req, res) => {
  try {
    const { title, description, image_url, order_index, is_active } = req.body;

    if (!title || !image_url) {
      return res.status(400).json({
        success: false,
        message: 'title and image_url are required'
      });
    }

    const slide = await OnboardingSlide.create({
      title,
      description: description || null,
      image_url,
      order_index: order_index != null ? order_index : 0,
      is_active: is_active !== false
    });

    return res.status(201).json({
      success: true,
      message: 'Onboarding slide created successfully',
      data: {
        id: slide.id,
        title: slide.title,
        description: slide.description || null,
        image_url: slide.image_url,
        order_index: slide.order_index,
        is_active: slide.is_active,
        created_at: slide.createdAt,
        updated_at: slide.updatedAt
      }
    });
  } catch (error) {
    console.error('Admin create onboarding slide error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create onboarding slide',
      error: error.message
    });
  }
};

/** Update an onboarding slide (admin only). */
export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, image_url, order_index, is_active } = req.body;

    const slide = await OnboardingSlide.findByPk(id);

    if (!slide) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding slide not found'
      });
    }

    if (title != null) slide.title = title;
    if (description !== undefined) slide.description = description || null;
    if (image_url != null) slide.image_url = image_url;
    if (order_index != null) slide.order_index = order_index;
    if (is_active !== undefined) slide.is_active = is_active;

    await slide.save();

    return res.json({
      success: true,
      message: 'Onboarding slide updated successfully',
      data: {
        id: slide.id,
        title: slide.title,
        description: slide.description || null,
        image_url: slide.image_url,
        order_index: slide.order_index,
        is_active: slide.is_active,
        created_at: slide.createdAt,
        updated_at: slide.updatedAt
      }
    });
  } catch (error) {
    console.error('Admin update onboarding slide error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update onboarding slide',
      error: error.message
    });
  }
};

/** Delete an onboarding slide (admin only). */
export const remove = async (req, res) => {
  try {
    const { id } = req.params;

    const slide = await OnboardingSlide.findByPk(id);

    if (!slide) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding slide not found'
      });
    }

    await slide.destroy();

    return res.json({
      success: true,
      message: 'Onboarding slide deleted successfully'
    });
  } catch (error) {
    console.error('Admin delete onboarding slide error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete onboarding slide',
      error: error.message
    });
  }
};
