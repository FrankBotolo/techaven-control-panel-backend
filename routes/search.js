import express from 'express';
import * as SearchController from '../controllers/SearchController.js';

const router = express.Router();

router.get('/', SearchController.search);
router.get('/suggestions', SearchController.getSuggestions);

export default router;

