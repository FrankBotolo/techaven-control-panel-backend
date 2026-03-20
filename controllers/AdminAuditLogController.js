import db from '../models/index.js';
import { Op } from 'sequelize';

const { AuditLog, User } = db;

/**
 * List audit logs with pagination and filters.
 * Useful for support, fraud detection, compliance, and system monitoring.
 *
 * Query params:
 * - page, limit (pagination)
 * - action (filter by action, supports partial match)
 * - actor_user_id (filter by user who performed the action)
 * - target_type (order, shop, user, product, etc.)
 * - target_id (specific entity)
 * - ip_address (filter by IP - useful for fraud)
 * - date_from (ISO date, logs >= this time)
 * - date_to (ISO date, logs <= this time)
 * - sort (createdAt:desc | createdAt:asc, default desc)
 */
export const list = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      actor_user_id,
      target_type,
      target_id,
      ip_address,
      date_from,
      date_to,
      sort = 'createdAt:desc'
    } = req.query;

    const where = {};

    if (action) {
      where.action = { [Op.like]: `%${action}%` };
    }
    if (actor_user_id) {
      where.actor_user_id = actor_user_id;
    }
    if (target_type) {
      where.target_type = target_type;
    }
    if (target_id) {
      where.target_id = String(target_id);
    }
    if (ip_address) {
      where.ip_address = { [Op.like]: `%${ip_address}%` };
    }

    if (date_from || date_to) {
      where.createdAt = {};
      if (date_from) {
        where.createdAt[Op.gte] = new Date(date_from);
      }
      if (date_to) {
        where.createdAt[Op.lte] = new Date(date_to);
      }
    }

    const [sortField, sortOrder] = sort.split(':');
    const order = [[sortField || 'createdAt', (sortOrder || 'DESC').toUpperCase()]];

    const offset = Math.max(0, (parseInt(page, 10) || 1) - 1) * Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'actor',
          attributes: ['id', 'name', 'email', 'phone_number', 'role'],
          required: false
        }
      ],
      order,
      limit: safeLimit,
      offset
    });

    const formatted = (rows || []).map((log) => ({
      id: log.id,
      action: log.action,
      actor: log.actor
        ? {
            id: log.actor.id,
            name: log.actor.name,
            email: log.actor.email,
            phone_number: log.actor.phone_number,
            role: log.actor.role
          }
        : null,
      actor_user_id: log.actor_user_id,
      target_type: log.target_type,
      target_id: log.target_id,
      metadata: log.metadata,
      ip_address: log.ip_address,
      user_agent: log.user_agent || null,
      created_at: log.createdAt
    }));

    return res.json({
      success: true,
      data: formatted,
      pagination: {
        page: parseInt(page, 10) || 1,
        limit: safeLimit,
        total: count,
        total_pages: Math.ceil(count / safeLimit)
      }
    });
  } catch (error) {
    console.error('Admin list audit logs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message
    });
  }
};

/**
 * Get a single audit log by id with full details.
 */
export const getOne = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await AuditLog.findByPk(id, {
      include: [
        {
          model: User,
          as: 'actor',
          attributes: ['id', 'name', 'email', 'phone_number', 'role', 'avatar_url'],
          required: false
        }
      ]
    });

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found'
      });
    }

    return res.json({
      success: true,
      data: {
        id: log.id,
        action: log.action,
        actor: log.actor
          ? {
              id: log.actor.id,
              name: log.actor.name,
              email: log.actor.email,
              phone_number: log.actor.phone_number,
              role: log.actor.role,
              avatar_url: log.actor.avatar_url
            }
          : null,
        actor_user_id: log.actor_user_id,
        target_type: log.target_type,
        target_id: log.target_id,
        metadata: log.metadata,
        ip_address: log.ip_address,
        user_agent: log.user_agent || null,
        created_at: log.createdAt,
        updated_at: log.updatedAt
      }
    });
  } catch (error) {
    console.error('Admin get audit log error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch audit log',
      error: error.message
    });
  }
};

/**
 * Get audit log statistics for dashboard/support overview.
 * - Actions by type (count)
 * - Recent activity summary
 * - Top actors by activity count
 */
export const getStats = async (req, res) => {
  try {
    const { date_from, date_to } = req.query;

    const where = {};
    if (date_from || date_to) {
      where.createdAt = {};
      if (date_from) where.createdAt[Op.gte] = new Date(date_from);
      if (date_to) where.createdAt[Op.lte] = new Date(date_to);
    }

    const [totalLogs, actionsByType, recentByTargetType] = await Promise.all([
      AuditLog.count({ where }),
      AuditLog.findAll({
        attributes: ['action', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']],
        where,
        group: ['action'],
        order: [[db.sequelize.literal('count'), 'DESC']],
        raw: true
      }),
      AuditLog.findAll({
        attributes: ['target_type', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']],
        where,
        group: ['target_type'],
        order: [[db.sequelize.literal('count'), 'DESC']],
        raw: true
      })
    ]);

    const actionsSummary = (actionsByType || []).map((r) => ({
      action: r.action,
      count: parseInt(r.count, 10)
    }));

    const targetSummary = (recentByTargetType || []).map((r) => ({
      target_type: r.target_type,
      count: parseInt(r.count, 10)
    }));

    return res.json({
      success: true,
      data: {
        total_logs: totalLogs,
        actions_by_type: actionsSummary,
        activity_by_target: targetSummary
      }
    });
  } catch (error) {
    console.error('Admin audit stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch audit statistics',
      error: error.message
    });
  }
};

/**
 * Delete a single audit log by id.
 */
export const remove = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await AuditLog.findByPk(id);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found'
      });
    }

    await log.destroy();

    return res.json({
      success: true,
      message: 'Audit log deleted successfully'
    });
  } catch (error) {
    console.error('Admin delete audit log error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete audit log',
      error: error.message
    });
  }
};

/**
 * Clear audit logs. Delete all or logs older than date_before (ISO date).
 * Query: date_before (optional) - only delete logs created before this date.
 */
export const clear = async (req, res) => {
  try {
    const { date_before } = req.query;

    const where = {};
    if (date_before) {
      where.createdAt = { [Op.lt]: new Date(date_before) };
    }

    const deleted = await AuditLog.destroy({ where });

    return res.json({
      success: true,
      message: date_before
        ? `Deleted ${deleted} audit log(s) older than ${date_before}`
        : `Deleted ${deleted} audit log(s)`,
      data: { deleted_count: deleted }
    });
  } catch (error) {
    console.error('Admin clear audit logs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear audit logs',
      error: error.message
    });
  }
};
