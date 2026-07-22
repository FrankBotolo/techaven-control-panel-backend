import { getAirtelPaymentOptions } from './airtelProviders.js';

/**
 * Mobile-money options for checkout/subscription pickers when using Pay Changu–backed flows.
 * Rows still come from `payment_methods` (Airtel only).
 */
export async function getPayChanguPaymentOptions() {
  const rows = await getAirtelPaymentOptions();
  return rows.map((r) => ({
    ...r,
    provider: 'paychangu'
  }));
}
