import { findEffectiveActiveSubscription } from '../services/subscription/userSubscriptionService.js';

/**
 * Blocks unless the user has exactly one logical "access grant":
 * subscription row status active AND end_date > now.
 * Sets req.activeSubscription to the Sequelize instance (+ included plan).
 */
export async function requireActiveSubscription(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const sub = await findEffectiveActiveSubscription(userId);
    if (!sub) {
      return res.status(403).json({
        success: false,
        message: 'An active, non-expired subscription is required'
      });
    }

    req.activeSubscription = sub;
    next();
  } catch (err) {
    next(err);
  }
}
