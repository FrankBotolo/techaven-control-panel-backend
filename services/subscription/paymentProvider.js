/**
 * Payment provider boundary (simulated). Production shop subscriptions use PayChangu.
 * Must NOT touch the database — caller applies status updates in a transaction.
 */

/**
 * @param {{ id: number, transaction_ref: string, amount: string|number, method: string }} payment
 * @returns {Promise<{ success: boolean; external_id?: string; raw?: object }>}
 */
export async function simulateProviderCharge(payment) {
  await new Promise((r) => setTimeout(r, 25));
  const forceFail = process.env.SUBSCRIPTION_PAYMENT_SIMULATE_FAILURE === 'true';
  if (forceFail) {
    return {
      success: false,
      raw: { reason: 'simulated_decline', ref: payment.transaction_ref }
    };
  }
  return {
    success: true,
    external_id: `sim_${payment.transaction_ref}`,
    raw: { simulated: true, at: new Date().toISOString() }
  };
}
