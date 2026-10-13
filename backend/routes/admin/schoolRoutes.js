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
  importStudents,
  bulkImportSchools,
} from '../../controllers/admin/schoolController.js';
import { 
  assignTestToSchool, 
  getTestAssignments, 
  deleteTestAssignment 
} from '../../controllers/admin/schoolTestAssignmentController.js';
import { schoolLogin } from '../../controllers/school/schoolAuthController.js';

const router = express.Router();

// Setup multer for CSV/Excel uploads
const upload = multer({ dest: 'uploads/temp/' });

// Ensure directory exists
import fs from 'fs';
if (!fs.existsSync('uploads/temp/')) {
  fs.mkdirSync('uploads/temp/', { recursive: true });
}

// === Public Routes ===
// School login using UDISE number + password
router.post('/login', schoolLogin);

// All school routes below require ADMIN role
router.use(verifyAdmin);

// School CRUD
router.get('/', getSchools);
router.get('/:id', getSchoolById);
router.post('/', createSchool);
router.put('/:id', updateSchool);
router.delete('/:id', deleteSchool);

// Bulk import schools from Excel (Theni district format)
router.post('/bulk-import', upload.single('file'), bulkImportSchools);

// School Students
router.get('/:id/students', getSchoolStudents);
router.post('/:id/students/import', upload.single('file'), importStudents);

// Test Assignments
router.get('/tests/:test_id/assignments', getTestAssignments);
router.post('/tests/:test_id/assign', assignTestToSchool);
router.delete('/assignments/:id', deleteTestAssignment);

export default router;
