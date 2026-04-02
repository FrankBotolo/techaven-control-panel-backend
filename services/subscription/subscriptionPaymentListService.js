import { Op } from 'sequelize';
import db from '../../models/index.js';

const { SubscriptionPayment, SubscriptionPackage, User } = db;

function toTransactionDto(payment, { includeUserSummary }) {
  const row = payment.get ? payment.get({ plain: true }) : payment;
  const plan = row.plan || payment.plan;
  const u = row.user || payment.user;

  const dto = {
    id: row.id,
    user_id: row.user_id,
    plan_id: row.plan_id,
    amount: parseFloat(row.amount),
    method: row.method,
    status: row.status,
    transaction_ref: row.transaction_ref,
    provider_payload: row.provider_payload ?? null,
    created_at: row.createdAt ?? row.created_at,
    updated_at: row.updatedAt ?? row.updated_at,
    plan: plan
      ? {
          id: plan.id,
          name: plan.name,
          slug: plan.slug ?? null,
          price_mwk: plan.price_mwk != null ? parseFloat(plan.price_mwk) : null
        }
      : null
  };

  if (includeUserSummary && u) {
    dto.user = {
      id: u.id,
      name: u.name,
      email: u.email ?? null,
      phone_number: u.phone_number ?? null
    };
  }

  return dto;
}

/**
 * @param {{ viewerUserId: number; viewerRole: string; query: Record<string, string> }}
 */
export async function listSubscriptionPayments({ viewerUserId, viewerRole, query }) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const where = {};

  if (viewerRole !== 'admin') {
    where.user_id = viewerUserId;
  } else if (query.user_id != null && String(query.user_id).trim() !== '') {
    const uid = parseInt(query.user_id, 10);
    if (uid && !Number.isNaN(uid)) {
      where.user_id = uid;
    }
  }

  if (query.status && ['pending', 'success', 'failed'].includes(query.status)) {
    where.status = query.status;
  }

  if (query.plan_id != null && String(query.plan_id).trim() !== '') {
    const pid = parseInt(query.plan_id, 10);
    if (pid && !Number.isNaN(pid)) {
      where.plan_id = pid;
    }
  }

  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;
  if (from && !Number.isNaN(from.getTime())) {
    where.createdAt = { ...(where.createdAt || {}), [Op.gte]: from };
  }
  if (to && !Number.isNaN(to.getTime())) {
    where.createdAt = { ...(where.createdAt || {}), [Op.lte]: to };
  }

  const includeUser = viewerRole === 'admin';

  const include = [
    {
      model: SubscriptionPackage,
      as: 'plan',
      attributes: ['id', 'name', 'slug', 'price_mwk'],
      required: false
    },
    ...(includeUser
      ? [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone_number'], required: false }]
      : [])
  ];

  const count = await SubscriptionPayment.count({ where });
  const rows = await SubscriptionPayment.findAll({
    where,
    include,
    order: [['id', 'DESC']],
    limit,
    offset
  });

  const transactions = rows.map((p) => toTransactionDto(p, { includeUserSummary: includeUser }));

  const totalPages = Math.ceil(count / limit) || 0;

  return {
    transactions,
    pagination: {
      current_page: page,
      per_page: limit,
      total_items: count,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1
    }
  };
}
