import express from 'express';
import {
  getTestForStudent,
  startTestAttempt,
  submitTestAttempt,
} from '../../controllers/student/studentTestController.js';

const router = express.Router();

// Get test details with questions for student
router.get('/:testId', getTestForStudent);

// Start a test attempt
router.post('/:testId/start', startTestAttempt);

// Submit test attempt
router.post('/:testId/submit', submitTestAttempt);

export default router;
