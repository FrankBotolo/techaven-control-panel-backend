import db from '../../models/index.js';

const { SubscriptionPackage } = db;

/**
 * @returns {Promise<Array<{ id: number; name: string; price: number; duration: number; features: unknown }>>}
 */
export async function listActivePlans() {
  const rows = await SubscriptionPackage.findAll({
    where: { is_active: true },
    order: [
      ['sort_order', 'ASC'],
      ['id', 'ASC']
    ]
  });
  return rows.map((p) => {
    const row = p.get({ plain: true });
    return {
      id: row.id,
      name: row.name,
      price: parseFloat(row.price_mwk),
      duration: row.duration_days,
      features: row.features ?? []
    };
  });
}

export async function getActivePlanById(planId) {
  return SubscriptionPackage.findOne({
    where: { id: planId, is_active: true }
  });
}
