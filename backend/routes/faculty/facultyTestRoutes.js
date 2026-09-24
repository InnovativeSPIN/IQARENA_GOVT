import express from 'express';
import {
  getFacultyTests,
  getFacultyTestById,
  createFacultyTest,
  updateFacultyTest,
  deleteFacultyTest,
  cloneFacultyTest,
  cloneFromTests,
  combineFromTest,
  getAllocatedSubjects,
  getTopicsForSubject,
  getAvailableQuestions,
  addQuestionsToTest,
  getTestQuestions,
  removeQuestionFromTest,
  getFacultyTestReport,
  sendReportToRecipient,
  sendReportEmails,
  ensureMinQuestions,
  ensureMinForAllTests,
  getExamsForFaculty,
  getBatchesForExam,
  autoAllocateQuestions,
  recomputeParentTotals,
  uncombineTest,
  getAggregatedTestQuestions
} from '../../controllers/faculty/facultyTestController.js';
import { verifyFaculty } from '../../middleware/auth.js';

const router = express.Router();

/**
 * @route GET /api/faculty/tests
 * @desc Get all tests created by faculty
 * @access Private (Faculty only)
 */
router.get('/tests', verifyFaculty, getFacultyTests);

/**
 * @route GET /api/faculty/tests/:id
 * @desc Get single test by ID (with questions)
 * @access Private (Faculty only)
 */
router.get('/tests/:id', verifyFaculty, getFacultyTestById);

/**
 * @route POST /api/faculty/tests
 * @desc Create new test
 * @access Private (Faculty only)
 */
router.post('/tests', verifyFaculty, createFacultyTest);

/**
 * @route PUT /api/faculty/tests/:id
 * @desc Update test details
 * @access Private (Faculty only)
 */
router.put('/tests/:id', verifyFaculty, updateFacultyTest);

/**
 * @route DELETE /api/faculty/tests/:id
 * @desc Delete a test
 * @access Private (Faculty only)
 */
router.delete('/tests/:id', verifyFaculty, deleteFacultyTest);

/**
 * @route GET /api/faculty/allocated-subjects
 * @desc Get subjects allocated to faculty
 * @access Private (Faculty only)
 */
router.get('/allocated-subjects', verifyFaculty, getAllocatedSubjects);

/**
 * @route GET /api/faculty/topics
 * @desc Get topics for a subject
 * @access Private (Faculty only)
 */
router.get('/topics', verifyFaculty, getTopicsForSubject);
// Get aggregated unique questions for a test (handles combined parents)
router.get('/tests/:id/aggregate-questions', verifyFaculty, getAggregatedTestQuestions);

/**
 * @route GET /api/faculty/available-questions
 * @desc Get available questions for test creation
 * @access Private (Faculty only)
 */
router.get('/available-questions', verifyFaculty, getAvailableQuestions);

/**
 * @route POST /api/faculty/tests/:id/questions
 * @desc Add questions to test
 * @access Private (Faculty only)
 */
router.post('/tests/:id/questions', verifyFaculty, addQuestionsToTest);

/**
 * @route POST /api/faculty/tests/:id/allocate
 * @desc Auto-allocate questions to test based on topic/subject
 * @access Private (Faculty only)
 */
router.post('/tests/:id/allocate', verifyFaculty, autoAllocateQuestions);
// Ensure a test has at least one question
router.post('/tests/:id/ensure-min', verifyFaculty, ensureMinQuestions);
// Bulk ensure all tests have at least one question
router.post('/tests/ensure-min-all', verifyFaculty, ensureMinForAllTests);
// Clone a test (create new test using questions from existing test)
router.post('/tests/:id/clone', verifyFaculty, cloneFacultyTest);
// Create a new test by combining questions from multiple existing tests
router.post('/tests/clone-from', verifyFaculty, cloneFromTests);
// Uncombine (dissolve) a combined parent test
router.post('/tests/:id/uncombine', verifyFaculty, uncombineTest);
// Recompute parent totals (deduplicated) — useful to correct existing combined parents
router.post('/tests/:id/recompute-totals', verifyFaculty, recomputeParentTotals);
// Combine a source test into per-subject child tests (faculty)
router.post('/tests/:id/combine', verifyFaculty, combineFromTest);

/**
 * @route GET /api/faculty/tests/:id/questions
 * @desc Get all questions for a test
 * @access Private (Faculty only)
 */
router.get('/tests/:id/questions', verifyFaculty, getTestQuestions);

/**
 * @route DELETE /api/faculty/tests/:testId/questions/:questionId
 * @desc Remove question from test
 * @access Private (Faculty only)
 */
router.delete('/tests/:testId/questions/:questionId', verifyFaculty, removeQuestionFromTest);

/**
 * @route GET /api/faculty/tests/:id/report
 * @desc Get test report with statistics
 * @access Private (Faculty only)
 */
router.get('/tests/:id/report', verifyFaculty, getFacultyTestReport);
router.post('/tests/:id/send-report-emails', verifyFaculty, sendReportEmails);
router.post('/tests/:id/send-report-to', verifyFaculty, sendReportToRecipient);

/**
 * @route GET /api/faculty/exams
 * @desc Get all exams for faculty
 * @access Private (Faculty only)
 */
router.get('/exams', verifyFaculty, getExamsForFaculty);

/**
 * @route GET /api/faculty/batches
 * @desc Get batches for an exam
 * @access Private (Faculty only)
 */
router.get('/batches', verifyFaculty, getBatchesForExam);

export default router;
