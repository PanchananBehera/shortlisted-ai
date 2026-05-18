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

const router = express.Router();

// ✅ Configure multer for file uploads (memory storage for pdf-parse)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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

// ==========================================
// ✅ AI ASSISTANT ROUTES (Cover Letter & Interview QA)
// ==========================================

// Generate Cover Letter
// Frontend calls: POST /api/ai/cover-letter
router.post('/cover-letter', protect, generateCoverLetter);

// Generate Interview Questions & Answers
// Frontend calls: POST /api/ai/interview-qa
router.post('/interview-qa', protect, generateInterviewQA);

// ==========================================
// ✅ RESUME ANALYSIS ROUTES
// ==========================================

// Analyze Resume (PDF/DOCX/TXT)
// Frontend calls: POST /api/ai/analyze-resume
router.post('/analyze-resume', protect, upload.single('resume'), analyzeResume);

// ==========================================
// ✅ HISTORY ROUTES
// ==========================================

// Get all analysis history for user
// Frontend calls: GET /api/ai/history
router.get('/history', protect, getAnalysisHistory);

// Get single analysis by ID
// Frontend calls: GET /api/ai/history/:id
router.get('/history/:id', protect, getAnalysisDetail);

// Delete analysis by ID
// Frontend calls: DELETE /api/ai/history/:id
router.delete('/history/:id', protect, deleteAnalysisHistory);

// ==========================================
// ✅ EMAIL & EXPORT ROUTES
// ==========================================

// Email optimized resume to user
// Frontend calls: POST /api/ai/email-resume
router.post('/email-resume', protect, emailResume);

// Export ATS Report as PDF
// Frontend calls: POST /api/ai/export-ats-report
router.post('/export-ats-report', protect, exportATSReport);

export default router;