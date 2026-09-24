import express from 'express';
import { 
	getProfileByUserId, 
	updateProfile, 
	changePassword 
} from '../../controllers/profile/profileController.js';
import { verifyToken } from '../../middleware/auth.js';

const router = express.Router();

/**
 * @route GET /api/profile/user/:userId
 * @desc Get complete profile details for a user
 * @access Public
 */
router.get('/user/:userId', getProfileByUserId);

/**
 * @route PUT /api/profile
 * @desc Update user profile
 * @access Private
 */
router.put('/', verifyToken, updateProfile);

/**
 * @route POST /api/profile/change-password
 * @desc Change user password
 * @access Private
 */
router.post('/change-password', verifyToken, changePassword);

export default router;
