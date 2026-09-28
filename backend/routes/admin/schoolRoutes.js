import express from 'express';
import multer from 'multer';
import { verifyAdmin } from '../../middleware/auth.js';
import { 
  getSchools, 
  getSchoolById, 
  createSchool, 
  updateSchool, 
  deleteSchool, 
  getSchoolStudents, 
  importStudents 
} from '../../controllers/admin/schoolController.js';
import { 
  assignTestToSchool, 
  getTestAssignments, 
  deleteTestAssignment 
} from '../../controllers/admin/schoolTestAssignmentController.js';

const router = express.Router();

// Setup multer for CSV uploads
const upload = multer({ dest: 'uploads/temp/' });

// Ensure directory exists
import fs from 'fs';
if (!fs.existsSync('uploads/temp/')) {
  fs.mkdirSync('uploads/temp/', { recursive: true });
}

// All school routes require ADMIN role
router.use(verifyAdmin);

// School CRUD
router.get('/', getSchools);
router.get('/:id', getSchoolById);
router.post('/', createSchool);
router.put('/:id', updateSchool);
router.delete('/:id', deleteSchool);

// School Students
router.get('/:id/students', getSchoolStudents);
router.post('/:id/students/import', upload.single('file'), importStudents);

// Test Assignments
router.get('/tests/:test_id/assignments', getTestAssignments);
router.post('/tests/:test_id/assign', assignTestToSchool);
router.delete('/assignments/:id', deleteTestAssignment);

export default router;
