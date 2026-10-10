import express from 'express';
import { authenticate, authorizeRoles, requireApprovedSeller, requireShopOwnerForShopParam } from '../../middleware/auth.js';
import * as controller from '../../controllers/V2SellerListingController.js';

const router = express.Router();
router.use(authenticate, authorizeRoles('seller'), requireApprovedSeller, requireShopOwnerForShopParam('shopId'));
router.get('/:shopId/listings', controller.list);
router.post('/:shopId/listings', controller.create);
router.get('/:shopId/listings/:id', controller.getOne);
router.patch('/:shopId/listings/:id', controller.update);
router.delete('/:shopId/listings/:id', controller.remove);

export default router;
