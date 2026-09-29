import express from 'express';
import { verifyFaculty } from '../../middleware/auth.js';
import {
  getSchoolOverview,
  getSchoolStudents,
  getSchoolStudentDetail,
  getSchoolTests,
  getSchoolTestReport,
  getSchoolNotifications,
} from '../../controllers/faculty/facultySchoolController.js';

// School monitoring: every endpoint is limited to the faculty's own school
const router = express.Router();

router.get('/school/overview', verifyFaculty, getSchoolOverview);
router.get('/school/students', verifyFaculty, getSchoolStudents);
router.get('/school/students/:id', verifyFaculty, getSchoolStudentDetail);
router.get('/school/tests', verifyFaculty, getSchoolTests);
router.get('/school/tests/:id/report', verifyFaculty, getSchoolTestReport);
router.get('/school/notifications', verifyFaculty, getSchoolNotifications);

export default router;
