import express from 'express';
import {
  listTopics,
  createTopic,
  updateTopic,
  deleteTopic,
} from '../../controllers/admin/topicsController.js';

const router = express.Router();

router.get('/', listTopics);
router.post('/', createTopic);
router.put('/:id', updateTopic);
router.delete('/:id', deleteTopic);

export default router;
