// src/routes/errorReports.js
// ✅ API routes for error reporting
import express from 'express';
import { 
  submitErrorReport, 
  getErrorReports, 
  updateErrorReport,
  getErrorReportStats
} from '../controllers/errorReportController.js';
import { limitErrorReports } from '../middleware/rateLimit.js';
import { protect as requireAuth, admin as requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// 🌐 PUBLIC: Submit error report (no auth required)
// ✅ Rate limited to prevent abuse
router.post('/error', 
  limitErrorReports, 
  submitErrorReport
);

// 🔐 ADMIN: Manage error reports (protected routes)
router.use('/errors', requireAuth, requireAdmin);

// List reports with filters
router.get('/errors', getErrorReports);

// Get dashboard statistics  
router.get('/errors/stats', getErrorReportStats);

// Update report status (acknowledge, resolve, etc.)
router.patch('/errors/:id', updateErrorReport);

export default router;