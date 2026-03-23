import db from '../models/index.js';
import { toPackageDto } from '../utils/subscriptionDto.js';

const { SubscriptionPackage } = db;

/** Public catalog — active packages only (for sellers & landing). */
export const listActive = async (req, res) => {
  try {
    const rows = await SubscriptionPackage.findAll({
      where: { is_active: true },
      order: [
        ['sort_order', 'ASC'],
        ['id', 'ASC']
      ]
    });

    return res.json({
      success: true,
      message: 'Subscription packages retrieved',
      data: {
        packages: (rows || []).map((p) => toPackageDto(p, { admin: false }))
      }
    });
  } catch (error) {
    console.error('Public list subscription packages error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription packages',
      error: error.message
    });
  }
};
