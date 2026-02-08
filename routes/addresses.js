import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as AddressController from '../controllers/AddressController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', AddressController.getAddresses);
router.post('/', AddressController.addAddress);
router.put('/:address_id', AddressController.updateAddress);
router.delete('/:address_id', AddressController.deleteAddress);
router.post('/:address_id/default', AddressController.setDefaultAddress);

export default router;

