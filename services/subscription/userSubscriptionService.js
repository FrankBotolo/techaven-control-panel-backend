import { Op } from 'sequelize';
import db from '../../models/index.js';

const { UserSubscription, SubscriptionPackage: PlanModel } = db;

const DAY_MS = 86400000;

export function addDays(date, days) {
  return new Date(date.getTime() + Number(days) * DAY_MS);
}

/**
 * Active = DB active AND end_date strictly after now (cron may lag slightly).
 */
export async function findEffectiveActiveSubscription(userId, options = {}) {
  const now = new Date();
  return UserSubscription.findOne({
    where: {
      user_id: userId,
      status: 'active',
      payment_status: 'paid',
      end_date: { [Op.gt]: now }
    },
    include: [{ model: PlanModel, as: 'plan', required: false }],
    order: [['id', 'DESC']],
    ...options
  });
}

export async function expireSubscriptionsPastEndDate() {
  const now = new Date();
  const [n] = await UserSubscription.update(
    { status: 'expired' },
    {
      where: {
        status: 'active',
        end_date: { [Op.lt]: now }
      }
    }
  );
  return n;
}

/**
 * Option B: extend non-expired active subscription; otherwise expire stale actives and create a new row.
 */
export async function extendOrCreateSubscription({ userId, plan, paymentId, transaction }) {
  const now = new Date();
  const durationDays = Number(plan.duration_days || 30) + Number(plan.trial_days || 0);

  const active = await UserSubscription.findOne({
    where: {
      user_id: userId,
      status: 'active',
      end_date: { [Op.gt]: now }
    },
    order: [['id', 'DESC']],
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  if (active) {
    const end = active.end_date instanceof Date ? active.end_date : new Date(active.end_date);
    const base = end > now ? end : now;
    const newEnd = addDays(base, durationDays);
    active.plan_id = plan.id;
    active.payment_id = paymentId;
    active.payment_status = 'paid';
    active.end_date = newEnd;
    await active.save({ transaction });
    return active;
  }

  await UserSubscription.update(
    { status: 'expired' },
    { where: { user_id: userId, status: 'active' }, transaction }
  );

  const start_date = now;
  const end_date = addDays(now, durationDays);

  return UserSubscription.create(
    {
      user_id: userId,
      plan_id: plan.id,
      payment_id: paymentId,
      start_date,
      end_date,
      status: 'active',
      payment_status: 'paid'
    },
    { transaction }
  );
}
