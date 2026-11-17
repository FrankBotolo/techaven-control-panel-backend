import db from '../models/index.js';
import CustomerPaymentMethod from '../models/CustomerPaymentMethod.js';
import { normalizeMobileNumber, setupState } from '../services/customer-setup-policy.js';

const mobileMoneyProviders = [
  { id: 1, slug: 'airtel-money', name: 'Airtel Money' },
  { id: 2, slug: 'mpamba', name: 'TNM Mpamba' },
];

export async function getPaymentMethods(req, res) {
  try {
    const payment_methods = await CustomerPaymentMethod.findAll({ where: { user_id: req.user.id }, attributes: ['id', 'type', 'provider', 'phone_number', 'is_default'], order: [['is_default', 'DESC'], ['createdAt', 'ASC']] });
    return res.json({ success: true, data: { payment_methods, available_providers: mobileMoneyProviders } });
  } catch { return res.status(503).json({ success: false, message: 'Unable to load payment methods. Please retry.' }); }
}
export async function addPaymentMethod(req, res) {
  try {
    if (setupState(req.user).requires_address) return res.status(409).json({ success: false, message: 'Complete your address first' });
    const { type, provider, is_default = false, use_for_contact = false } = req.body;
    if (type !== 'mobile_money' || typeof is_default !== 'boolean' || typeof use_for_contact !== 'boolean') return res.status(400).json({ success: false, message: 'Choose a mobile-money provider and valid preferences' });
    if (!mobileMoneyProviders.some(option => option.slug === provider)) return res.status(400).json({ success: false, message: 'Choose an available mobile-money provider' });
    const phone_number = normalizeMobileNumber(req.body.phone_number);
    const method = await db.sequelize.transaction(async transaction => {
      const user = await db.User.findByPk(req.user.id, { transaction, lock: transaction.LOCK.UPDATE });
      const count = await CustomerPaymentMethod.count({ where: { user_id: user.id }, transaction });
      const makeDefault = is_default || count === 0;
      if (makeDefault) await CustomerPaymentMethod.update({ is_default: false }, { where: { user_id: user.id }, transaction });
      const [saved] = await CustomerPaymentMethod.findOrCreate({ where: { user_id: user.id, provider, phone_number }, defaults: { type, is_default: makeDefault }, transaction });
      if (makeDefault && !saved.is_default) await saved.update({ is_default: true }, { transaction });
      await user.update({ payment_setup_status: 'completed', ...(use_for_contact ? { phone_number } : {}) }, { transaction });
      return { id: saved.id, type: saved.type, provider: saved.provider, phone_number: saved.phone_number, is_default: saved.is_default };
    });
    return res.status(201).json({ success: true, message: 'Payment method saved', data: method });
  } catch (error) {
    const status = error.name === 'SequelizeUniqueConstraintError' ? 409 : error.status || 503;
    return res.status(status).json({ success: false, message: status === 409 ? 'This contact number is already used by another account. Save it without using it for contact.' : status === 400 ? error.message : 'Unable to save your payment method. Please retry.' });
  }
}
export async function deletePaymentMethod(req, res) {
  try {
    const removed = await db.sequelize.transaction(async transaction => {
      await db.User.findByPk(req.user.id, { transaction, lock: transaction.LOCK.UPDATE });
      const method = await CustomerPaymentMethod.findOne({ where: { id: req.params.payment_method_id, user_id: req.user.id }, transaction });
      if (!method) return false;
      await method.destroy({ transaction });
      if (method.is_default) {
        const next = await CustomerPaymentMethod.findOne({ where: { user_id: req.user.id }, order: [['createdAt', 'ASC']], transaction });
        if (next) await next.update({ is_default: true }, { transaction });
      }
      return true;
    });
    return removed ? res.json({ success: true, data: null }) : res.status(404).json({ success: false, message: 'Payment method not found' });
  } catch { return res.status(503).json({ success: false, message: 'Unable to remove payment method. Please retry.' }); }
}
