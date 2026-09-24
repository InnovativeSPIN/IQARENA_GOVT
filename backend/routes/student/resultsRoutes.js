import express from 'express';
import { getStudentResults, getTestResultDetail } from '../../controllers/student/resultsController.js';

const router = express.Router();

// Get all test results for student
router.get('/', getStudentResults);

// Get detailed result for a specific test
router.get('/:testId', getTestResultDetail);

export default router;
