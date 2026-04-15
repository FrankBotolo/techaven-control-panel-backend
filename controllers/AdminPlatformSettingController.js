import db from '../models/index.js';
import { logAudit, auditContext } from '../utils/audit.js';

const { PlatformSetting } = db;

const toDto = (row) => ({
  seller_commission_percent: row ? parseFloat(row.seller_commission_percent) || 0 : 0,
  default_points_mwk_per_point:
    row && row.default_points_mwk_per_point != null
      ? parseFloat(row.default_points_mwk_per_point)
      : null,
  updated_at: row?.updatedAt || row?.updated_at || null
});

export const getSettings = async (req, res) => {
  try {
    let row = await PlatformSetting.findOne({ order: [['id', 'ASC']] });
    if (!row) {
      row = await PlatformSetting.create({ seller_commission_percent: 0 });
    }
    return res.json({
      success: true,
      message: 'Platform settings retrieved',
      data: toDto(row)
    });
  } catch (error) {
    console.error('Admin get platform settings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch platform settings',
      error: error.message
    });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const { seller_commission_percent, default_points_mwk_per_point } = req.body;
    if (seller_commission_percent === undefined && default_points_mwk_per_point === undefined) {
      return res.status(400).json({
        success: false,
        message:
          'Provide seller_commission_percent (0–100) and/or default_points_mwk_per_point (MWK per point for general/legacy balances, or null to disable)'
      });
    }

    let row = await PlatformSetting.findOne({ order: [['id', 'ASC']] });
    if (!row) {
      row = await PlatformSetting.create({ seller_commission_percent: 0 });
    }

    const metadata = {};
    if (seller_commission_percent !== undefined && seller_commission_percent !== null) {
      const pct = parseFloat(seller_commission_percent);
      if (Number.isNaN(pct) || pct < 0 || pct > 100) {
        return res.status(400).json({
          success: false,
          message: 'seller_commission_percent must be a number between 0 and 100'
        });
      }
      row.seller_commission_percent = pct;
      metadata.seller_commission_percent = pct;
    }

    if (default_points_mwk_per_point !== undefined) {
      if (default_points_mwk_per_point === null || default_points_mwk_per_point === '') {
        row.default_points_mwk_per_point = null;
        metadata.default_points_mwk_per_point = null;
      } else {
        const r = parseFloat(default_points_mwk_per_point);
        if (Number.isNaN(r) || r < 0) {
          return res.status(400).json({
            success: false,
            message: 'default_points_mwk_per_point must be a non-negative number or null'
          });
        }
        row.default_points_mwk_per_point = r;
        metadata.default_points_mwk_per_point = r;
      }
    }

    await row.save();

    await logAudit({
      ...auditContext(req),
      action: 'admin.platform_settings.update',
      actor_user_id: req.user?.id || null,
      target_type: 'platform_settings',
      target_id: row.id,
      metadata
    });

    return res.json({
      success: true,
      message: 'Platform settings updated',
      data: toDto(row)
    });
  } catch (error) {
    console.error('Admin update platform settings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update platform settings',
      error: error.message
    });
  }
};
