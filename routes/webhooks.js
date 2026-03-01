import express from 'express';
import * as WebhookController from '../controllers/WebhookController.js';

const router = express.Router();

router.post('/onekhusa', WebhookController.onekhusa);

export default router;
