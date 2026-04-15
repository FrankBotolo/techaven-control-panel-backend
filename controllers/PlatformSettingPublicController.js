import db from '../models/index.js';

const { PlatformSetting } = db;

/** Public read-only: current seller commission rate (for pricing / seller transparency). */
export const getPublic = async (req, res) => {
  try {
    let row = await PlatformSetting.findOne({ order: [['id', 'ASC']] });
    if (!row) {
      row = await PlatformSetting.create({ seller_commission_percent: 0 });
    }
    return res.json({
      success: true,
      data: {
        seller_commission_percent: parseFloat(row.seller_commission_percent) || 0,
        default_points_mwk_per_point:
          row.default_points_mwk_per_point != null
            ? parseFloat(row.default_points_mwk_per_point)
            : null
      }
    });
  } catch (error) {
    console.error('Public platform settings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch platform settings',
      error: error.message
    });
  }
};
