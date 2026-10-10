import express from 'express';
import { authenticate, authorizeRoles, requireApprovedSeller } from '../../middleware/auth.js';
import { create } from '../../controllers/V2ProductRequestController.js';

const router = express.Router();
router.post('/', authenticate, authorizeRoles('seller'), requireApprovedSeller, create);

export default router;
