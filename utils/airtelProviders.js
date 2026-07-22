import db from '../models/index.js';

const { PaymentMethod } = db;

/**
 * Active mobile-money payment options (Airtel) for pickers: call GET /api/payment-methods.
 */
export async function getAirtelPaymentOptions() {
  const methods = await PaymentMethod.findAll({
    where: { is_active: true },
    order: [['sort_order', 'ASC']],
    attributes: ['id', 'name', 'slug', 'psp_id', 'provider', 'icon']
  });

  return methods.map((m) => ({
    id: m.id,
    name: m.name,
    slug: m.slug,
    psp_id: m.psp_id,
    provider: m.provider,
    icon: m.icon || m.slug
  }));
}
