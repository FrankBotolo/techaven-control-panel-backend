import db from '../models/index.js';

const { PaymentMethod } = db;

/**
 * Active Malipo mobile-money options (Airtel, TNM) for pickers: call GET /api/payment-methods or read from subscription payload.
 */
export async function getMalipoPaymentOptions() {
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

/**
 * Resolve Malipo PSP from explicit psp_id, DB payment row id, or slug (e.g. airtel, tnm).
 * @returns {{ pspId: number|null, error: string|null }}
 */
export async function resolveMalipoPspId(body = {}) {
  const pspRaw = body.psp_id;
  const pmIdRaw = body.payment_method_id;
  const slugRaw = body.provider_slug ?? body.slug;

  const parsed = parseInt(pspRaw, 10);
  if (pspRaw !== undefined && pspRaw !== null && pspRaw !== '' && !Number.isNaN(parsed)) {
    if (parsed === 1 || parsed === 2) {
      return { pspId: parsed, error: null };
    }
    return { pspId: null, error: 'psp_id must be 1 (Airtel) or 2 (TNM)' };
  }

  if (pmIdRaw !== undefined && pmIdRaw !== null && pmIdRaw !== '') {
    const pm = await PaymentMethod.findOne({
      where: { id: parseInt(pmIdRaw, 10), is_active: true }
    });
    if (pm && (pm.psp_id === 1 || pm.psp_id === 2)) {
      return { pspId: pm.psp_id, error: null };
    }
    return { pspId: null, error: 'Invalid or inactive payment_method_id' };
  }

  if (slugRaw !== undefined && slugRaw !== null && String(slugRaw).trim()) {
    const slug = String(slugRaw).toLowerCase().trim();
    const pm = await PaymentMethod.findOne({
      where: { slug, is_active: true }
    });
    if (pm && (pm.psp_id === 1 || pm.psp_id === 2)) {
      return { pspId: pm.psp_id, error: null };
    }
    return { pspId: null, error: 'Invalid provider slug (e.g. airtel, tnm)' };
  }

  return { pspId: null, error: null };
}
