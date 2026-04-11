import db from '../models/index.js';

const { PlatformSetting } = db;

export async function getSellerCommissionPercent() {
  let row = await PlatformSetting.findOne({ order: [['id', 'ASC']] });
  if (!row) {
    row = await PlatformSetting.create({ seller_commission_percent: 0 });
  }
  const p = parseFloat(row.seller_commission_percent);
  if (Number.isNaN(p) || p < 0) return 0;
  return Math.min(100, p);
}

/**
 * @param {number} grossSubtotal - seller item subtotal (MWK), before commission
 * @param {number} percent - platform commission 0–100
 * @returns {{ netToSeller: number, platformFee: number, percent: number, gross: number }}
 */
export function computeSellerEscrowSplit(grossSubtotal, percent) {
  const gross = Math.max(0, Number(grossSubtotal) || 0);
  const p = Math.min(100, Math.max(0, Number(percent) || 0));
  const platformFee = Math.round(((gross * p) / 100) * 100) / 100;
  let netToSeller = Math.round((gross - platformFee) * 100) / 100;
  if (netToSeller < 0) netToSeller = 0;
  return { netToSeller, platformFee, percent: p, gross };
}
