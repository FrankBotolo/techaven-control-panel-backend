import crypto from 'crypto';

export function generateSubscriptionTransactionRef() {
  const ts = Date.now().toString(36);
  const rand = crypto.randomBytes(10).toString('hex');
  return `SPAY_${ts}_${rand}`;
}
