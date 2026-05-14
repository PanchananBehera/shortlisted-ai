import express from 'express';
import { protect } from '../middleware/auth.js';
import { getDashboardStats } from '../controllers/analyticsController.js';

const router = express.Router();

router.get('/dashboard', protect, getDashboardStats);

export default router;