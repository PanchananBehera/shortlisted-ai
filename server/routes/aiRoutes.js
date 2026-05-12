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

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
      'text/plain'
    ];
    
    const ext = file.originalname ? file.originalname.split('.').pop().toLowerCase() : '';
    const validExts = ['pdf', 'docx', 'txt'];

    if (allowed.includes(file.mimetype) || validExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, and TXT files are allowed'), false);
    }
  }
});

// ✅ Protected AI routes
router.post('/cover-letter', protect, generateCoverLetter);
router.post('/interview-qa', protect, generateInterviewQA);
router.post('/analyze-resume', protect, upload.single('resume'), analyzeResume);

// ✅ History routes
router.get('/history', protect, getAnalysisHistory);
router.get('/history/:id', protect, getAnalysisDetail);
router.delete('/history/:id', protect, deleteAnalysisHistory);

// ✅ Email Optimized Resume route
router.post('/email-resume', protect, emailResume);

// ✅ NEW: Export ATS Report PDF route
router.post('/export-ats-report', protect, exportATSReport);

export default router;