import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as SmsController from '../controllers/SmsController.js';

const router = express.Router();
router.use(authenticate);

router.post('/send', SmsController.send);
router.get('/balance', SmsController.balance);

export default router;
