import { getMalipoPaymentOptions } from './malipoProviders.js';

/**
 * Mobile-money options for checkout/subscription pickers when using Pay Changu–backed flows.
 * Rows still come from `payment_methods` (same Airtel/TNM psp_id convention as Malipo era).
 */
export async function getPayChanguPaymentOptions() {
  const rows = await getMalipoPaymentOptions();
  return rows.map((r) => ({
    ...r,
    provider: 'paychangu'
  }));
}
