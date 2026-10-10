import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import { checkout } from '../../controllers/V2OrderController.js';

const router = express.Router();
router.post('/', authenticate, checkout);

export default router;
