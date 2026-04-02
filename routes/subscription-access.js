import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/requireActiveSubscription.js';
import * as SubscriptionAccessController from '../controllers/SubscriptionAccessController.js';

const router = express.Router();

router.get('/plans', SubscriptionAccessController.listPlans);

router.post(
  '/subscribe',
  authenticate,
  authorizeRoles('seller', 'admin'),
  SubscriptionAccessController.subscribe
);

router.get(
  '/subscription/transactions',
  authenticate,
  authorizeRoles('seller', 'admin'),
  SubscriptionAccessController.listTransactions
);

router.get(
  '/subscription/status/:userId',
  authenticate,
  SubscriptionAccessController.getStatus
);

/** Example protected handler — stack requireActiveSubscription on real seller routes the same way */
router.get(
  '/subscription/ping',
  authenticate,
  requireActiveSubscription,
  SubscriptionAccessController.protectedPing
);

export default router;
