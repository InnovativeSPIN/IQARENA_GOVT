import express from 'express';
import * as controllers from '../../controllers/admin/testControllers.js';

const router = express.Router();


router.get('/', controllers.getTests);
router.get('/:id', controllers.getTestById);
router.post('/', controllers.createTest);
router.put('/:id', controllers.updateTest);
router.post('/:id/retest', controllers.retestTest);
router.delete('/:id', controllers.deleteTest);

// Test status
router.patch('/:id/status', controllers.toggleTestStatus);

// Test questions
router.post('/:id/questions', controllers.addQuestionsToTest);
router.post('/:id/combine', controllers.combineFromTest);
router.post('/:id/allocate', controllers.allocateQuestionsToTest); // Allocate questions by count
router.post('/:id/allocations/preview', controllers.previewAllocations || ((req,res)=>res.status(501).json({success:false,message:'previewAllocations not implemented'}))); // Preview allocations (no DB changes)
router.post('/ensure-for-subject', controllers.ensureTestForSubject || ((req,res)=>res.status(501).json({success:false,message:'ensureTestForSubject not implemented'}))); // Create or return per-subject test
router.post('/exams/:examId/subjects/:subjectId/allocations', controllers.applyAllocationsForSubject || ((req,res)=>res.status(501).json({success:false,message:'applyAllocationsForSubject not implemented'}))); // Preview/apply allocations per subject (createIfMissing optional)
router.delete('/:id/questions/:questionId', controllers.removeQuestionFromTest);
router.delete('/:id/questions/remove-excess', controllers.removeQuestionFromTest); // Remove excess questions

// Test reports
router.get('/:id/report', controllers.getTestReport);
router.get('/:id/report/pdf', controllers.getTestReportPdf);

export default router;
