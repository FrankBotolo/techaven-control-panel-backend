import express from 'express';
import { authenticate, authorizeRoles, requireApprovedSeller } from '../../middleware/auth.js';
import { create, listMine, update, remove } from '../../controllers/V2ProductRequestController.js';

const router = express.Router();
router.use(authenticate, authorizeRoles('seller'), requireApprovedSeller);
router.get('/', listMine);
router.post('/', create);
router.patch('/:id', update);
router.delete('/:id', remove);

export default router;
