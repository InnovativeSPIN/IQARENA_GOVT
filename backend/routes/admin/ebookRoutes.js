import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { verifyAdmin } from '../../middleware/auth.js';
import {
  getEBooks,
  getEBookById,
  createEBook,
  updateEBook,
  deleteEBook,
  incrementDownload,
} from '../../controllers/admin/ebookController.js';

const router = express.Router();

// Ensure upload directory exists: uploads/ebooks
const uploadDir = path.join(process.cwd(), 'uploads', 'ebooks');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage for PDF and document uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${cleanName}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max limit
});

const cpUpload = upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'cover_image', maxCount: 1 },
]);

// Download increment route can be accessed by authenticated users
router.post('/:id/download', incrementDownload);

// All management routes require ADMIN role
router.use(verifyAdmin);

router.get('/', getEBooks);
router.get('/:id', getEBookById);
router.post('/', cpUpload, createEBook);
router.put('/:id', cpUpload, updateEBook);
router.delete('/:id', deleteEBook);

export default router;
