import express from 'express';
import {
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getSubjectAllocations,
  getAllAllocations,
  listFaculty,
  setSubjectAllocations,
} from '../../controllers/admin/subjectsController.js';

const router = express.Router();

// GET /api/admin/subjects - list all subjects (optional ?exam=NEET/JEE)
router.get('/', listSubjects);

// POST /api/admin/subjects - create a subject
router.post('/', createSubject);

// PUT /api/admin/subjects/:id - update subject
router.put('/:id', updateSubject);

// DELETE /api/admin/subjects/:id - delete subject
router.delete('/:id', deleteSubject);

// GET /api/admin/subjects/allocations - list all allocations across subjects
router.get('/allocations', getAllAllocations);

// GET /api/admin/subjects/faculty/list - list faculty users only
router.get('/faculty/list', listFaculty);

// GET /api/admin/subjects/:id/allocations - list allocations for a subject
router.get('/:id/allocations', getSubjectAllocations);

// POST /api/admin/subjects/:id/allocations - set allocations (replace) -> expects { facultyIds: [..] }
router.post('/:id/allocations', setSubjectAllocations);

export default router;
