import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Image proofs attached to admin/faculty messages: uploads/messages, images only, max 5 MB
const dir = path.join(process.cwd(), 'uploads', 'messages');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

export const messageImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `msg-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.startsWith('image/') && ALLOWED.has(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Only image files (JPG, PNG, WEBP, GIF) up to 5 MB are allowed'), ok);
  },
}).single('image');

// Wrap multer so upload errors come back as JSON 400s
export const withMessageImage = (req, res, next) =>
  messageImageUpload(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
