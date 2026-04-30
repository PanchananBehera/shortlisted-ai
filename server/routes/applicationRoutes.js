import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getApplications,
  getApplicationById,
  createApplication,
  updateApplication,
  deleteApplication
} from '../controllers/applicationController.js';

const router = express.Router();

// Public routes: None (all require auth)

// Protected routes
router.route('/')
  .get(protect, getApplications)
  .post(protect, createApplication);

router.route('/:id')
  .get(protect, getApplicationById)
  .put(protect, updateApplication)
  .delete(protect, deleteApplication);

export default router;