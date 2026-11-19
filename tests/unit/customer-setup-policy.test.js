import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMobileNumber, setupState } from '../../services/customer-setup-policy.js';

test('Malawi numbers normalize without accepting malformed or foreign numbers', () => {
  for (const value of ['0983780656', '265983780656', '+265 983 78 06 56']) assert.equal(normalizeMobileNumber(value), '+265983780656');
  for (const value of ['', '+44983780656', '983780656', '+2659837806561', '<script>', null]) assert.throws(() => normalizeMobileNumber(value), { status: 400 });
});
test('only enrolled new accounts require address and receive optional payment setup', () => {
  assert.equal(setupState({ onboarding_required: false, payment_setup_status: 'pending' }).requires_address, false);
  assert.equal(setupState({ onboarding_required: false, payment_setup_status: 'pending' }).offer_payment_setup, false);
  assert.equal(setupState({ onboarding_required: true }).requires_address, true);
  assert.equal(setupState({ onboarding_required: true, address_completed_at: new Date(), payment_setup_status: 'pending' }).offer_payment_setup, true);
  for (const status of ['skipped', 'completed']) assert.equal(setupState({ onboarding_required: true, address_completed_at: new Date(), payment_setup_status: status }).offer_payment_setup, false);
});
