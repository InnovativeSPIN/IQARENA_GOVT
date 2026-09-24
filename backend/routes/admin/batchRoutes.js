import express from 'express';
import {
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
  getAllBatchesDebug
} from '../../controllers/admin/batchControllers.js';

const router = express.Router();

// Debug endpoint (place before /:id to avoid conflicts)
router.get('/debug/all', getAllBatchesDebug);

router.get('/', getBatches);
router.get('/:id', getBatchById);
router.post('/', createBatch);
router.put('/:id', updateBatch);
router.delete('/:id', deleteBatch);

export default router;
