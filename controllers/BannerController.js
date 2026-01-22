import db from '../models/index.js';

const { Banner } = db;

export const index = async (req, res) => {
  try {
    const banners = await Banner.findAll();

    return res.json({
      status: 'success',
      data: banners
    });
  } catch (error) {
    console.error('Banners index error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch banners',
      error: error.message
    });
  }
};

