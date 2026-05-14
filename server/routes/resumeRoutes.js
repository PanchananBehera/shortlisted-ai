import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth.js';
import { analyzeResume } from '../controllers/resumeController.js';

const router = express.Router();

// 🔹 Configure multer with MEMORY storage (better for pdf-parse)
const storage = multer.memoryStorage();

// 🔹 File filter - PDF ONLY (strict validation)
const fileFilter = (req, file, cb) => {
  // Check MIME type
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } 
  // Fallback: check extension
  else if (file.originalname?.toLowerCase().endsWith('.pdf')) {
    cb(null, true);
  } 
  // Reject everything else
  else {
    cb(new Error('Only PDF files are allowed. Please upload a .pdf file.'), false);
  }
};

// 🔹 Upload configuration
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 1 // Only one file at a time
  }
});

// 🔹 Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File size exceeds 5MB limit. Please upload a smaller PDF.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Only one file can be uploaded at a time.'
      });
    }
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
  next();
};

// 🔹 POST /api/resume/analyze - Upload & Analyze PDF
router.post('/analyze', 
  protect, 
  upload.single('resume'), 
  handleMulterError, 
  analyzeResume
);

// 🔹 GET /api/resume/history - Get analysis history
router.get('/history', protect, async (req, res) => {
  try {
    const AnalysisHistory = await import('../models/AnalysisHistory.js');
    
    const history = await AnalysisHistory.default.find({ 
      userId: req.user._id 
    })
    .sort({ uploadedAt: -1 })
    .limit(10)
    .select('resumeName uploadedAt analysis.overallScore analysis.atsScore');
    
    res.json({ 
      success: true, 
      count: history.length, 
      data: history 
    });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch analysis history' 
    });
  }
});

export default router;