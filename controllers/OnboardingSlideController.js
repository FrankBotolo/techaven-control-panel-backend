import db from '../models/index.js';

const { OnboardingSlide } = db;

/** GET /api/onboarding/slides - Public, no auth. Returns active slides ordered by order_index. */
export const getSlides = async (req, res) => {
  try {
    const slides = await OnboardingSlide.findAll({
      where: { is_active: true },
      order: [['order_index', 'ASC']]
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
    console.error('Onboarding slides error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch onboarding slides',
      error: error.message
    });
  }
};
