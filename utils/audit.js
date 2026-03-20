import db from '../models/index.js';

const { AuditLog } = db;

/** Extract IP and user agent from request for audit logging. Use: logAudit({ ...auditContext(req), action, ... }) */
export const auditContext = (req) =>
  req
    ? {
        ip_address: req.ip || req.connection?.remoteAddress,
        user_agent: req.get?.('user-agent') || req.headers?.['user-agent'] || null
      }
    : {};

export const logAudit = async ({
  action,
  actor_user_id = null,
  target_type = null,
  target_id = null,
  metadata = null,
  ip_address = null,
  user_agent = null
}) => {
  try {
    await AuditLog.create({
      action,
      actor_user_id,
      target_type,
      target_id: target_id != null ? String(target_id) : null,
      metadata,
      ip_address,
      user_agent
    });
  } catch (error) {
    // Audit logging must never break the request flow
    console.error('AuditLog error:', error.message);
  }
};


