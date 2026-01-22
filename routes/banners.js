import express from 'express';
import * as BannerController from '../controllers/BannerController.js';

const router = express.Router();

router.get('/', BannerController.index);

export default router;

