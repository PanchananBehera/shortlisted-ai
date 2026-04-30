import express from 'express';
import { protect } from '../middleware/auth.js';
import { generateCoverLetter, generateInterviewQA } from '../controllers/aiController.js';

const router = express.Router();

// Protected AI routes
router.post('/cover-letter', protect, generateCoverLetter);
router.post('/interview-qa', protect, generateInterviewQA);

export default router;