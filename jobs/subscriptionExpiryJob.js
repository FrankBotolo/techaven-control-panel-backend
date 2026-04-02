import cron from 'node-cron';
import { expireSubscriptionsPastEndDate } from '../services/subscription/userSubscriptionService.js';

/**
 * Daily job: mark subscriptions expired when end_date < now.
 * Cron pattern: default `5 0 * * *` (00:05 UTC) — override with SUBSCRIPTION_EXPIRY_CRON.
 */
export function startSubscriptionExpiryJob() {
  const pattern = process.env.SUBSCRIPTION_EXPIRY_CRON || '5 0 * * *';
  cron.schedule(pattern, async () => {
    try {
      const n = await expireSubscriptionsPastEndDate();
      if (n > 0) {
        console.log(`[subscription-expiry] Updated ${n} subscription(s) to expired`);
      }
    } catch (err) {
      console.error('[subscription-expiry]', err);
    }
  });
  console.log(`[subscription-expiry] Scheduled (${pattern})`);
}
