import express from 'express';
import {
  getStudentEBooks,
  downloadStudentEBook,
} from '../../controllers/student/ebookController.js';

const router = express.Router();

// Get published ebooks for students
router.get('/', getStudentEBooks);

// Download and increment download counter
router.post('/:id/download', downloadStudentEBook);

export default router;
