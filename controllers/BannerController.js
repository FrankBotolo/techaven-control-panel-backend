import db from '../models/index.js';

const { Banner } = db;

export const index = async (req, res) => {
  try {
    const banners = await Banner.findAll();
    const formatted = (banners || []).map((b) => ({
      id: b.id,
      title: b.title || null,
      subtitle: b.subtitle || null,
      image: b.image,
      link: b.link || null,
      is_active: b.is_active !== false
    }));

    return res.json({
      success: true,
      message: 'Banners retrieved',
      data: formatted
    });
  } catch (error) {
    console.error('Banners index error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch banners',
      data: null,
      error: error.message
    });
  }
};

