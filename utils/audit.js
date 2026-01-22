import db from '../models/index.js';

const { AuditLog } = db;

export const logAudit = async ({
  action,
  actor_user_id = null,
  target_type = null,
  target_id = null,
  metadata = null,
  ip_address = null
}) => {
  try {
    await AuditLog.create({
      action,
      actor_user_id,
      target_type,
      target_id: target_id != null ? String(target_id) : null,
      metadata,
      ip_address
    });
  } catch (error) {
    // Audit logging must never break the request flow
    console.error('AuditLog error:', error.message);
  }
};


