import express from 'express';
import { getAssignedTests, getTestStatistics } from '../../controllers/student/assignedTestsController.js';

const router = express.Router();

// Get all assigned tests for student
router.get('/', getAssignedTests);

// Get test statistics for student
router.get('/statistics', getTestStatistics);

export default router;
