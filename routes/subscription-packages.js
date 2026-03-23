import express from 'express';
import * as SubscriptionPackagePublicController from '../controllers/SubscriptionPackagePublicController.js';

const router = express.Router();

/** Public catalog (no auth) — same packages sellers see before signing in */
router.get('/', SubscriptionPackagePublicController.listActive);

export default router;
