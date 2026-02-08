import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as HelpController from '../controllers/HelpController.js';

const router = express.Router();

router.get('/topics', HelpController.getTopics);
router.get('/faqs', HelpController.getFAQs);
router.post('/tickets', authenticate, HelpController.submitTicket);

export default router;

