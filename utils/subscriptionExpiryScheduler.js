import { expireSubscriptionsPastEndDate } from '../services/subscription/userSubscriptionService.js';

const hoursRaw = parseInt(String(process.env.SUBSCRIPTION_EXPIRY_INTERVAL_HOURS || '6'), 10);
const HOURS = Number.isFinite(hoursRaw) && hoursRaw > 0 ? hoursRaw : 6;
const INTERVAL_MS = HOURS * 60 * 60 * 1000;

/**
 * Periodically mark user_subscriptions past end_date as expired (no node-cron).
 */
export function startSubscriptionExpiryJob() {
  const tick = async () => {
    try {
      const n = await expireSubscriptionsPastEndDate();
      if (n > 0) {
        console.log(`[subscription-expiry] Marked ${n} user subscription(s) expired`);
      }
    } catch (err) {
      console.error('[subscription-expiry]', err);
    }
  };

  void tick();
  setInterval(() => void tick(), INTERVAL_MS);
  console.log(`[subscription-expiry] Scheduler running every ${HOURS}h`);
}
