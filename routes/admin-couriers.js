import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import * as AdminCourierController from '../controllers/AdminCourierController.js';

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles('admin'));

router.get('/', AdminCourierController.listCourierServices);
router.post('/', AdminCourierController.createCourierService);
router.patch('/:id', AdminCourierController.updateCourierService);
router.delete('/:id', AdminCourierController.deleteCourierService);

export default router;
