import express from 'express';
import {
  listSubtopics,
  createSubtopic,
  updateSubtopic,
  deleteSubtopic,
} from '../../controllers/admin/subtopicsController.js';

const router = express.Router();

router.get('/', listSubtopics);
router.post('/', createSubtopic);
router.put('/:id', updateSubtopic);
router.delete('/:id', deleteSubtopic);

export default router;
