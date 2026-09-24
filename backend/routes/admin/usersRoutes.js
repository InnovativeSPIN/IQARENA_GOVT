import express from 'express';
import { listUsers, createUser, getUserById, updateUser, deleteUser, resetPassword, updateUserStatus, fixUserRoles } from '../../controllers/admin/usersController.js';
import { verifyAdmin } from '../../middleware/auth.js';

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

router.post('/fix-roles', verifyAdmin, fixUserRoles);

export default router;
