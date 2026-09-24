import express from 'express';
import {
  getQuestions,
  getQuestionById,
  getTestsForQuestion,
  createQuestion,
  updateQuestion,
  bulkUploadQuestions,
  deleteQuestion,
  toggleQuestionStatus
} from '../../controllers/admin/questionControllers.js';
import { removeQuestionImage } from '../../controllers/admin/questionControllers.js';

const router = express.Router();

// GET /api/admin/questions - Get all questions with filters
router.get('/', getQuestions);

// GET /api/admin/questions/:id - Get single question
router.get('/:id', getQuestionById);

// POST /api/admin/questions - Create new question
router.post('/', createQuestion);

// PUT /api/admin/questions/:id - Update question
router.put('/:id', updateQuestion);

// POST /api/admin/questions/bulk-upload - bulk upload questions via CSV or JSON
router.post('/bulk-upload', bulkUploadQuestions);

// DELETE /api/admin/questions/:id - Delete question
router.delete('/:id', deleteQuestion);

// GET /api/admin/questions/:id/tests - Get tests containing this question
router.get('/:id/tests', getTestsForQuestion);

// PATCH /api/admin/questions/:id/toggle-status - Toggle question status
router.patch('/:id/toggle-status', toggleQuestionStatus);

// PATCH /api/admin/questions/:id/images - remove or update specific image field
router.patch('/:id/images', removeQuestionImage);

export default router;
