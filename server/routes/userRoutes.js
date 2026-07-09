import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getUserProgress, getLeaderboard } from '../controllers/userController.js';

const router = express.Router();

// ✅ Get user's gamification progress
router.get('/user/progress', protect, getUserProgress);

// ✅ Get global leaderboard
router.get('/user/leaderboard', protect, getLeaderboard);

export default router;