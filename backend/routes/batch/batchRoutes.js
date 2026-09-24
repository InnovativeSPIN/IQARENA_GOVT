import express from 'express';
import {
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
  getAllBatchesDebug
} from '../../controllers/batch/batchController.js';

const router = express.Router();

// Get all batches
router.get('/', getBatches);

// Debug endpoint (keep this above /:id)
router.get('/debug', getAllBatchesDebug);

// Get single batch
router.get('/:id', getBatchById);

// Create batch
router.post('/', createBatch);

// Update batch
router.put('/:id', updateBatch);

// Delete batch
router.delete('/:id', deleteBatch);

export default router;