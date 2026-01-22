import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import * as InvitationController from '../controllers/InvitationController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all invitations (with filters)
router.get('/', InvitationController.index);

// Get a specific invitation by ID
router.get('/:id', InvitationController.show);

export default router;

