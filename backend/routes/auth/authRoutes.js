import express from 'express';
import {
  getUserById,
  registerUser,
  loginUser
} from '../../controllers/auth/authController.js';

const router = express.Router();

/**
 * @route   GET /api/auth/user/:userId
 * @desc    Get user details by user ID
 * @access  Public
 */
router.get('/user/:userId', getUserById);

/**
 * @route   POST /api/auth/register
 * @desc    Register user with password
 * @access  Public
 */
router.post('/register', registerUser);

/**
 * @route   POST /api/auth/login
 * @desc    User login
 * @access  Public
 */
router.post('/login', loginUser);

export default router;

