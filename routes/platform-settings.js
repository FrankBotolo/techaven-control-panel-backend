import express from 'express';
import * as PlatformSettingPublicController from '../controllers/PlatformSettingPublicController.js';

const router = express.Router();

router.get('/', PlatformSettingPublicController.getPublic);

export default router;
