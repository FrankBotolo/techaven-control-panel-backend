export function normalizeMobileNumber(value) {
  const compact = String(value ?? '').replace(/[\s()-]/g, '');
  const normalized = /^0[89]\d{8}$/.test(compact) ? `+265${compact.slice(1)}` : /^265[89]\d{8}$/.test(compact) ? `+${compact}` : compact;
  if (!/^\+265[89]\d{8}$/.test(normalized)) {
    const error = new Error('Enter a valid Malawi mobile number, for example +265 983 780 656');
    error.status = 400; throw error;
  }
  return normalized;
}
export function setupState(user) {
  return {
    requires_address: Boolean(user.onboarding_required && !user.address_completed_at),
    payment_setup_status: user.payment_setup_status,
    offer_payment_setup: Boolean(user.onboarding_required && user.address_completed_at && user.payment_setup_status === 'pending'),
  };
}
