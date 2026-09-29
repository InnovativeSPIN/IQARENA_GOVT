import express from 'express';
import { verifyAdmin } from '../../middleware/auth.js';
import { getReportFilters, getReport, getStudentAnswerSheet } from '../../controllers/admin/reportsController.js';
import { adminListMessages, adminSendMessage, markMessageRead } from '../../controllers/messagesController.js';
import { withMessageImage } from '../../lib/messageUpload.js';

const router = express.Router();

// Reports: by school, test and class
router.get('/reports/filters', verifyAdmin, getReportFilters);
router.get('/reports', verifyAdmin, getReport);
router.get('/reports/tests/:testId/students/:studentId/answers', verifyAdmin, getStudentAnswerSheet);

// Messages with school faculty
router.get('/messages', verifyAdmin, adminListMessages);
router.post('/messages', verifyAdmin, withMessageImage, adminSendMessage);
router.patch('/messages/:id/read', verifyAdmin, markMessageRead);

export default router;
