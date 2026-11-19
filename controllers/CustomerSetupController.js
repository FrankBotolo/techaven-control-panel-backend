import db from '../models/index.js';
import { setupState } from '../services/customer-setup-policy.js';

export async function getSetup(req, res) {
  return res.json({ success: true, data: setupState(req.user) });
}
export async function completeAddress(req, res) {
  try {
    if (!await db.ShippingAddress.count({ where: { user_id: req.user.id } })) return res.status(409).json({ success: false, message: 'Save your delivery address first' });
    await req.user.update({ address_completed_at: req.user.address_completed_at || new Date() });
    return res.json({ success: true, data: setupState(req.user) });
  } catch { return res.status(503).json({ success: false, message: 'Unable to complete address setup. Please retry.' }); }
}
export async function skipPayment(req, res) {
  if (setupState(req.user).requires_address) return res.status(409).json({ success: false, message: 'Complete your address first' });
  try {
    const state = await db.sequelize.transaction(async transaction => {
      const user = await db.User.findByPk(req.user.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (user.payment_setup_status === 'pending') await user.update({ payment_setup_status: 'skipped' }, { transaction });
      return setupState(user);
    });
    return res.json({ success: true, data: state });
  } catch { return res.status(503).json({ success: false, message: 'Unable to save your preference. Please retry.' }); }
}
