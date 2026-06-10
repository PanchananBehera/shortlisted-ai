import express from 'express';
import { saveInterviewSession, getInterviewHistory } from '../controllers/interviewController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/sessions', protect, saveInterviewSession);
router.get('/sessions/:userId', protect, getInterviewHistory);

export default router;