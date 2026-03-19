import express from 'express';
import * as OnboardingSlideController from '../controllers/OnboardingSlideController.js';

const router = express.Router();

// Public - no auth, no parameters
router.get('/slides', OnboardingSlideController.getSlides);

export default router;
