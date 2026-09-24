import express from 'express';
import {
  listAllocatedExams,
  listAllocatedSubjects,
  listAllocatedTopics,
  countQuestions,
  createExam,
  deleteExam,
} from '../../controllers/admin/examMetaController.js';

const router = express.Router();

// GET /api/admin/meta/exams -
router.get('/exams', listAllocatedExams);

// GET /api/admin/meta/subjects?examId= 
router.get('/subjects', listAllocatedSubjects);

// GET /api/admin/meta/topics?subjectId= 
router.get('/topics', listAllocatedTopics);

// GET /api/admin/meta/questions/count?examId=&subjectId=&topicId?=&subtopicId?=
router.get('/questions/count', countQuestions);

// POST /api/admin/meta/exams - create a new exam
router.post('/exams', createExam);

// DELETE /api/admin/meta/exams/:id - delete an exam
router.delete('/exams/:id', deleteExam);

export default router;
