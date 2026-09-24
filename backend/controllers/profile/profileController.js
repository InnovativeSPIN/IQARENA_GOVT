import pool from '../../config/db.js';
import bcrypt from 'bcryptjs';

// Get complete profile by user ID
export const getProfileByUserId = async (req, res) => {
	const { userId } = req.params;
	try {
		const connection = await pool.getConnection();
		const [rows] = await connection.execute(
			`SELECT
				u.id,
                u.userId,
				u.name,
				u.phone,
				u.email,
				r.name as role,
				b.id as batchId,
				b.batch_name as batchName,
				b.batch_name as batch,
				u.created_at as createdAt
			FROM users u
			LEFT JOIN roles r ON u.role_id = r.id
			LEFT JOIN students s ON s.user_id = u.id
			LEFT JOIN batches b ON b.id = s.batch_id
			WHERE u.id = ?`,
			[userId]
		);
		connection.release();

		if (!rows || rows.length === 0) {
			return res.status(404).json({ success: false, message: 'User not found' });
		}

		const user = rows[0];
		return res.status(200).json({ success: true, user });
	} catch (error) {
		console.error('Error fetching profile:', error);
		return res.status(500).json({ success: false, message: 'Error fetching profile', error: error.message });
	}
};

// Update user profile
export const updateProfile = async (req, res) => {
	try {
		const userId = req.user?.id; // From auth middleware
		const { name, phone } = req.body;

		if (!userId) {
			return res.status(401).json({ success: false, message: 'Unauthorized' });
		}

		if (!name || !phone) {
			return res.status(400).json({
				success: false,
				message: 'Name and phone are required'
			});
		}

		const connection = await pool.getConnection();

		// Update profile
		await connection.execute(
			`UPDATE users 
			SET name = ?, phone = ?, updated_at = NOW() 
			WHERE id = ?`,
			[name, phone, userId]
		);

		// Get updated profile
		const [updatedRows] = await connection.execute(
			`SELECT 
				u.id, 
				u.userid, 
				u.name, 
				u.email, 
				u.phone, 
				u.created_at as createdAt,
				r.name as role
			FROM users u
			LEFT JOIN roles r ON u.role_id = r.id
			WHERE u.id = ?`,
			[userId]
		);

		connection.release();

		return res.status(200).json({
			success: true,
			message: 'Profile updated successfully',
			user: updatedRows[0]
		});
	} catch (error) {
		console.error('Error updating profile:', error);
		return res.status(500).json({
			success: false,
			message: 'Error updating profile',
			error: error.message
		});
	}
};

// Change password
export const changePassword = async (req, res) => {
	try {
		const userId = req.user?.id; // From auth middleware
		const { currentPassword, newPassword } = req.body;

		if (!userId) {
			return res.status(401).json({ success: false, message: 'Unauthorized' });
		}

		if (!currentPassword || !newPassword) {
			return res.status(400).json({
				success: false,
				message: 'Current password and new password are required'
			});
		}

		if (newPassword.length < 6) {
			return res.status(400).json({
				success: false,
				message: 'New password must be at least 6 characters long'
			});
		}

		const connection = await pool.getConnection();

		// Get current password hash
		const [userRows] = await connection.execute(
			`SELECT password FROM users WHERE id = ?`,
			[userId]
		);

		if (!userRows || userRows.length === 0) {
			connection.release();
			return res.status(404).json({ success: false, message: 'User not found' });
		}

		// Verify current password
		const isPasswordValid = await bcrypt.compare(currentPassword, userRows[0].password);
		if (!isPasswordValid) {
			connection.release();
			return res.status(401).json({
				success: false,
				message: 'Current password is incorrect'
			});
		}

		// Hash new password
		const hashedPassword = await bcrypt.hash(newPassword, 10);

		// Update password
		await connection.execute(
			`UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?`,
			[hashedPassword, userId]
		);

		connection.release();

		return res.status(200).json({
			success: true,
			message: 'Password changed successfully'
		});
	} catch (error) {
		console.error('Error changing password:', error);
		return res.status(500).json({
			success: false,
			message: 'Error changing password',
			error: error.message
		});
	}
};

export default {
	getProfileByUserId,
	updateProfile,
	changePassword
};
