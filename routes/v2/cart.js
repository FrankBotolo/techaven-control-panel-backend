import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import * as controller from '../../controllers/V2CartController.js';

const router = express.Router();
router.use(authenticate);
router.get('/', controller.getCart);
router.post('/items', controller.add);
router.put('/items/:item_id', controller.update);
router.delete('/items/:item_id', controller.remove);
router.delete('/', controller.clear);

export default router;
