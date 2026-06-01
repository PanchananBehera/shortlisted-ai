// server/routes/aiRoutes.js
import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth.js';
import { 
  generateCoverLetter, 
  generateInterviewQA, 
  analyzeResume,
  getAnalysisHistory,
  getAnalysisDetail,
  deleteAnalysisHistory,
  emailResume,
  exportATSReport 
} from '../controllers/aiController.js';
import { 
  processInterviewTurn, 
  evaluateInterview, 
  getInterviewHistory, 
  getInterviewDetail 
} from '../controllers/interviewController.js';

const router = express.Router();

// ✅ Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
      'application/msword',
      'text/plain'
    ];
    
    const ext = file.originalname ? file.originalname.split('.').pop().toLowerCase() : '';
    const validExts = ['pdf', 'docx', 'doc', 'txt'];

    if (allowed.includes(file.mimetype) || validExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, DOC, and TXT files are allowed'), false);
    }
  }
});

// ✅ AI ASSISTANT ROUTES
router.post('/cover-letter', protect, generateCoverLetter);
router.post('/interview-qa', protect, generateInterviewQA);

// ✅ INTERACTIVE MOCK INTERVIEW ROUTES
router.post('/interview/turn', protect, processInterviewTurn);
router.post('/interview/evaluate', protect, evaluateInterview);
router.get('/interview/history', protect, getInterviewHistory);
router.get('/interview/history/:id', protect, getInterviewDetail);

// ✅ RESUME ANALYSIS ROUTES
router.post('/analyze-resume', protect, upload.single('resume'), analyzeResume);

// ✅ HISTORY ROUTES
router.get('/history', protect, getAnalysisHistory);
router.get('/history/:id', protect, getAnalysisDetail);
router.delete('/history/:id', protect, deleteAnalysisHistory);

// ✅ EMAIL & EXPORT ROUTES
router.post('/email-resume', protect, emailResume);
router.post('/export-ats-report', protect, exportATSReport);

export default router;