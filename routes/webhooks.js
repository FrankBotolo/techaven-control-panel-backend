import express from 'express';
import * as WebhookController from '../controllers/WebhookController.js';
import * as PayChanguCallbackController from '../controllers/PayChanguCallbackController.js';
import * as AirtelWebhookController from '../controllers/AirtelWebhookController.js';

const router = express.Router();

router.post('/malipo', WebhookController.malipo);
/** POST — Pay Changu dashboard webhook (JSON + Signature). Prefer this for Flutter / server notifications. */
router.post('/paychangu', PayChanguCallbackController.webhook);
/** GET — Pay Changu browser redirect; query string carries status, tx_ref, … */
router.get('/paychangu/callback', PayChanguCallbackController.callback);
/** POST — Airtel Money direct API webhook. Configure callback URL in Airtel Money developer portal. */
router.post('/airtel', AirtelWebhookController.webhook);

export default router;
