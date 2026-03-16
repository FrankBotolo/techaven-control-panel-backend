import express from 'express';
import * as WebhookController from '../controllers/WebhookController.js';

const router = express.Router();

router.post('/malipo', WebhookController.malipo);

export default router;
