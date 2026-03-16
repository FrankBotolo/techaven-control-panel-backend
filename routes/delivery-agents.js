import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import * as DeliveryAgentController from '../controllers/DeliveryAgentController.js';

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles('delivery_agent'));

router.post('/register', upload.fields([{ name: 'id_document', maxCount: 1 }]), DeliveryAgentController.register);
router.get('/profile', DeliveryAgentController.getProfile);
router.patch('/availability', DeliveryAgentController.setAvailability);
router.get('/jobs', DeliveryAgentController.listJobs);
router.get('/jobs/available', DeliveryAgentController.getAvailableJobs);
router.post('/jobs/:job_id/accept', DeliveryAgentController.acceptJob);
router.post('/jobs/:job_id/decline', DeliveryAgentController.declineJob);
router.post('/jobs/:job_id/pickup', DeliveryAgentController.markPickedUp);
router.post('/jobs/:job_id/deliver', DeliveryAgentController.markDelivered);

export default router;
