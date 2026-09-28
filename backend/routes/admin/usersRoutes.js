import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { listUsers, createUser, getUserById, updateUser, deleteUser, resetPassword, updateUserStatus, fixUserRoles, importFaculty } from '../../controllers/admin/usersController.js';
import { verifyAdmin } from '../../middleware/auth.js';

const upload = multer({ dest: 'uploads/temp/' });
if (!fs.existsSync('uploads/temp/')) {
  fs.mkdirSync('uploads/temp/', { recursive: true });
}
const router = express.Router();

// GET /api/admin/users - list all users
router.get('/', listUsers);
// GET /api/admin/users/:id - get single user by id
router.get('/:id', getUserById);

// POST /api/admin/users - create user
router.post('/', createUser);

// PUT /api/admin/users/:id - update user
router.put('/:id', updateUser);

// PUT /api/admin/users/:id/reset-password - reset user password
router.put('/:id/reset-password', resetPassword);

// PUT /api/admin/users/:id/status - update user status only
router.put('/:id/status', updateUserStatus);

// DELETE /api/admin/users/:id - delete user
router.delete('/:id', deleteUser);

router.post('/import-faculty', verifyAdmin, upload.single('file'), importFaculty);

router.post('/fix-roles', verifyAdmin, fixUserRoles);

export default router;
