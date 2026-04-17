import express from 'express';
import * as WebhookController from '../controllers/WebhookController.js';
import * as PayChanguCallbackController from '../controllers/PayChanguCallbackController.js';

const router = express.Router();

router.post('/malipo', WebhookController.malipo);
/** GET — Pay Changu browser redirect; query string carries status, tx_ref, … */
router.get('/paychangu/callback', PayChanguCallbackController.callback);

export default router;
