import express from 'express';
import multer from 'multer';
import path from 'path';
import { uploadImage } from '../../controllers/admin/uploadController.js';

const router = express.Router();

// Prepare uploads directory at repository root, e.g. <workspace>/uploads
const uploadDir = path.join(process.cwd(), 'uploads');
// Ensure directory exists
import fs from 'fs';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

// POST /api/admin/upload-image
router.post('/upload-image', upload.single('image'), uploadImage);

export default router;
