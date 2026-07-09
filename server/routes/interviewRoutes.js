import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { saveInterviewSession, updateInterviewSessionAudio } from '../controllers/interviewController.js';
import InterviewSession from '../models/interviewSession.js';

const router = express.Router();

// ✅ Get user's interview sessions
router.get('/sessions', protect, async (req, res) => {
  try {
    const sessions = await InterviewSession.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('targetRole dreamCompany overallScore duration audioRecordingUrl createdAt');
    
    res.json({ success: true, sessions });
  } catch (error) {
    console.error('Failed to fetch interview sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch interview history' });
  }
});

// ✅ Save session after interview
router.post('/sessions', protect, saveInterviewSession);

// ✅ Update session with audio
router.patch('/sessions/:id', protect, updateInterviewSessionAudio);

export default router;