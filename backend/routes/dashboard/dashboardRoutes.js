import { optionalAuth } from '../../middleware/auth.js';
import express from 'express';
import { getAdminDashboardStats, getAllExams, getStudentDashboardStats } from '../../controllers/dashboard/dashBoardController.js';

const router = express.Router();

// Admin dashboard
router.get('/stats', getAdminDashboardStats);
router.get('/exams', getAllExams);

// Student dashboard
router.get('/student/stats', optionalAuth, getStudentDashboardStats);

export default router;
