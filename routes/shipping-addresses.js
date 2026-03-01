import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as AddressController from '../controllers/AddressController.js';

const router = express.Router();
router.use(authenticate);

router.get('/', AddressController.getAddresses);
router.post('/', AddressController.addAddress);
router.put('/:id', AddressController.updateAddress);
router.delete('/:id', AddressController.deleteAddress);
router.post('/:id/set-default', AddressController.setDefaultAddress);

export default router;
