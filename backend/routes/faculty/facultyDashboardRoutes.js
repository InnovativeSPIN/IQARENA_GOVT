import express from 'express';
import {
	getFacultyStats,
	getRecentActivity,
	getPerformanceMetrics,
	changePassword,
	getFacultyProfile,
	updateFacultyProfile
} from '../../controllers/faculty/facultyDashboardController.js';
import { verifyFaculty } from '../../middleware/auth.js';

const router = express.Router();

/**
 * @route GET /api/faculty/dashboard/stats
 * @desc Get faculty dashboard statistics
 * @access Private (Faculty only)
 */
router.get('/dashboard/stats', verifyFaculty, getFacultyStats);

/**
 * @route GET /api/faculty/dashboard/recent-activity
 * @desc Get recent activity for faculty
 * @access Private (Faculty only)
 */
router.get('/dashboard/recent-activity', verifyFaculty, getRecentActivity);

/**
 * @route GET /api/faculty/dashboard/performance-metrics
 * @desc Get performance metrics for faculty
 * @access Private (Faculty only)
 */
router.get('/dashboard/performance-metrics', verifyFaculty, getPerformanceMetrics);

/**
 * @route GET /api/faculty/profile
 * @desc Get faculty profile details
 * @access Private (Faculty only)
 */
router.get('/profile', verifyFaculty, getFacultyProfile);

/**
 * @route PUT /api/faculty/profile
 * @desc Update faculty profile
 * @access Private (Faculty only)
 */
router.put('/profile', verifyFaculty, updateFacultyProfile);

/**
 * @route POST /api/faculty/change-password
 * @desc Change faculty password
 * @access Private (Faculty only)
 */
router.post('/change-password', verifyFaculty, changePassword);

export default router;
