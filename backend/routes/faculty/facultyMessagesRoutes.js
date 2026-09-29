import express from 'express';
import { verifyFaculty } from '../../middleware/auth.js';
import { facultyListMessages, facultySendMessage, markMessageRead } from '../../controllers/messagesController.js';
import { resetSchoolStudentPassword } from '../../controllers/faculty/facultySchoolController.js';
import { withMessageImage } from '../../lib/messageUpload.js';

const router = express.Router();

router.get('/messages', verifyFaculty, facultyListMessages);
router.post('/messages', verifyFaculty, withMessageImage, facultySendMessage);
router.patch('/messages/:id/read', verifyFaculty, markMessageRead);

// Faculty resets the login PIN of a student in their own school
router.post('/school/students/:id/reset-password', verifyFaculty, resetSchoolStudentPassword);

export default router;
