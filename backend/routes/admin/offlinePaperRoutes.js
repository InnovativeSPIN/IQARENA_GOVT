import express from 'express';
import controller from '../../controllers/admin/offlinePaperController.js';

const router = express.Router();

// POST /api/admin/offline-papers => create a draft paper
router.post('/', controller.createPaper);
// POST /api/admin/offline-papers/preview => preview selection without creating
router.post('/preview', controller.previewPaper);
// GET list
router.get('/', controller.getPapers);
// GET single
router.get('/:id', controller.getPaperById);
// POST /:id/generate => generate PDF files
router.post('/:id/generate', controller.generatePaper);
// GET /:id/download/question or answer
router.get('/:id/download/:type', controller.downloadFile);

// POST /:id/preview-generate => generate preview PDF/DOC for given paper (without saving)
router.post('/:id/preview-generate', controller.previewGeneratePaper);
// GET /:id/download/preview/:type => download generated preview files (question | question_doc)
router.get('/:id/download/preview/:type', controller.downloadPreviewFile);

// Update paper
router.put('/:id', controller.updatePaper);
// Reset allocations for a paper (delete allocated questions)
router.delete('/:id/allocations', controller.resetAllocations);
// Delete paper
router.delete('/:id', controller.deletePaper);


export default router;
