import pool from '../../config/db.js';
import bcrypt from 'bcryptjs';

export const getFacultyStats = async (req, res) => {
	try {
		const facultyUserId = req.user?.id; 

		if (!facultyUserId) {
			return res.status(401).json({ success: false, message: 'Unauthorized' });
		}

		const connection = await pool.getConnection();

		const [questionStats] = await connection.execute(
			`SELECT COUNT(*) as totalQuestions 
			FROM questions 
			WHERE created_by_user_id = ?`,
			[facultyUserId]
		);

		// Get total topics for allocated subjects
		const [topicStats] = await connection.execute(
			`SELECT COUNT(DISTINCT t.id) as totalTopics
			FROM topics t
			INNER JOIN subject_allocation sa ON t.subject_id = sa.subject_id
			WHERE sa.faculty_user_id = ?`,
			[facultyUserId]
		);

		// Get active tests count (published tests for faculty's subjects)
		const [testStats] = await connection.execute(
			`SELECT COUNT(DISTINCT ts.id) as activeTests
			FROM tests ts
			INNER JOIN subject_allocation sa ON ts.subject_id = sa.subject_id
			WHERE sa.faculty_user_id = ? AND ts.status = 'published'`,
			[facultyUserId]
		);

		// Get allocated subjects count
		const [subjectStats] = await connection.execute(
			`SELECT COUNT(DISTINCT subject_id) as allocatedSubjects
			FROM subject_allocation
			WHERE faculty_user_id = ?`,
			[facultyUserId]
		);

		connection.release();

		return res.status(200).json({
			success: true,
			stats: {
				totalQuestions: questionStats[0].totalQuestions || 0,
				totalTopics: topicStats[0].totalTopics || 0,
				activeTests: testStats[0].activeTests || 0,
				allocatedSubjects: subjectStats[0].allocatedSubjects || 0
			}
		});
	} catch (error) {
		console.error('Error fetching faculty stats:', error);
		return res.status(500).json({
			success: false,
			message: 'Error fetching statistics',
			error: error.message
		});
	}
};

// Get recent activity for faculty
export const getRecentActivity = async (req, res) => {
	try {
		const facultyUserId = req.user?.id;
		const limit = parseInt(req.query.limit) || 10;

		if (!facultyUserId) {
			return res.status(401).json({ success: false, message: 'Unauthorized' });
		}

		const connection = await pool.getConnection();

		// Get recent questions added
		const [recentQuestions] = await connection.execute(
			`SELECT 
				q.id,
				'question' as type,
				CONCAT('Added question to ', s.name) as action,
				CONCAT(s.name, ' (', e.name, ')') as subject,
				q.created_at as timestamp
			FROM questions q
			INNER JOIN topics t ON q.topic_id = t.id
			INNER JOIN subjects s ON t.subject_id = s.id
			INNER JOIN exams e ON s.exam_id = e.id
			WHERE q.created_by_user_id = ?
			ORDER BY q.created_at DESC
			LIMIT ?`,
			[facultyUserId, limit]
		);

		// Get recent topic creations
		const [recentTopics] = await connection.execute(
			`SELECT 
				t.id,
				'topic' as type,
				CONCAT('Created topic: ', t.topic_name) as action,
				CONCAT(s.name, ' (', e.name, ')') as subject,
				t.created_at as timestamp
			FROM topics t
			INNER JOIN subjects s ON t.subject_id = s.id
			INNER JOIN exams e ON s.exam_id = e.id
			INNER JOIN subject_allocation sa ON s.id = sa.subject_id
			WHERE sa.faculty_user_id = ?
			ORDER BY t.created_at DESC
			LIMIT ?`,
			[facultyUserId, limit]
		);

		// Combine and sort activities
		const activities = [...recentQuestions, ...recentTopics]
			.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
			.slice(0, limit)
			.map((activity, index) => ({
				id: index + 1,
				action: activity.action,
				subject: activity.subject,
				time: formatTimeAgo(activity.timestamp),
				type: activity.type
			}));

		connection.release();

		return res.status(200).json({
			success: true,
			activities
		});
	} catch (error) {
		console.error('Error fetching recent activity:', error);
		return res.status(500).json({
			success: false,
			message: 'Error fetching recent activity',
			error: error.message
		});
	}
};

// Get performance metrics for faculty
export const getPerformanceMetrics = async (req, res) => {
	try {
		const facultyUserId = req.user?.id;

		if (!facultyUserId) {
			return res.status(401).json({ success: false, message: 'Unauthorized' });
		}

		const connection = await pool.getConnection();

		// Calculate average student score from tests using faculty's questions
		const [scoreStats] = await connection.execute(
			`SELECT 
				COALESCE(AVG(sta.score), 0) as avgScore
			FROM student_test_attempts sta
			INNER JOIN tests t ON sta.test_id = t.id
			INNER JOIN subject_allocation sa ON t.subject_id = sa.subject_id
			WHERE sa.faculty_user_id = ? 
			AND sta.status = 'completed'`,
			[facultyUserId]
		);

		// Get test proposals (published tests are considered approved)
		const [proposalStats] = await connection.execute(
			`SELECT COUNT(*) as approvedProposals
			FROM tests t
			INNER JOIN subject_allocation sa ON t.subject_id = sa.subject_id
			WHERE sa.faculty_user_id = ? AND t.status = 'published'`,
			[facultyUserId]
		);

		// Get pending reviews (draft tests)
		const [pendingStats] = await connection.execute(
			`SELECT COUNT(*) as pendingReviews
			FROM tests t
			INNER JOIN subject_allocation sa ON t.subject_id = sa.subject_id
			WHERE sa.faculty_user_id = ? AND t.status = 'draft'`,
			[facultyUserId]
		);

		connection.release();

		return res.status(200).json({
			success: true,
			metrics: {
				avgStudentScore: Math.round(scoreStats[0].avgScore) || 0,
				proposalsApproved: proposalStats[0].approvedProposals || 0,
				pendingReviews: pendingStats[0].pendingReviews || 0
			}
		});
	} catch (error) {
		console.error('Error fetching performance metrics:', error);
		return res.status(500).json({
			success: false,
			message: 'Error fetching performance metrics',
			error: error.message
		});
	}
};

// Change faculty password
export const changePassword = async (req, res) => {
	try {
		const facultyUserId = req.user?.id;
		const { currentPassword, newPassword } = req.body;

		if (!facultyUserId) {
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
			[facultyUserId]
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
			[hashedPassword, facultyUserId]
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

// Get faculty profile details
export const getFacultyProfile = async (req, res) => {
	try {
		const facultyUserId = req.user?.id;

		if (!facultyUserId) {
			return res.status(401).json({ success: false, message: 'Unauthorized' });
		}

		const connection = await pool.getConnection();

		// Get faculty details
		const [facultyRows] = await connection.execute(
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
			WHERE u.id = ? AND u.role_id = 2`,
			[facultyUserId]
		);

		if (!facultyRows || facultyRows.length === 0) {
			connection.release();
			return res.status(404).json({ success: false, message: 'Faculty not found' });
		}

		// Get allocated subjects
		const [subjectsRows] = await connection.execute(
			`SELECT 
				s.id,
				s.name as subjectName,
				s.exam_id as examId,
				e.name as examType,
				COUNT(DISTINCT t.id) as topicCount,
				COUNT(DISTINCT q.id) as questionCount
			FROM subject_allocation sa
			INNER JOIN subjects s ON sa.subject_id = s.id
			INNER JOIN exams e ON s.exam_id = e.id
			LEFT JOIN topics t ON t.subject_id = s.id
			LEFT JOIN questions q ON q.topic_id = t.id AND q.created_by_user_id = sa.faculty_user_id
			WHERE sa.faculty_user_id = ?
			GROUP BY s.id, s.name, s.exam_id, e.name`,
			[facultyUserId]
		);

		connection.release();

		const faculty = facultyRows[0];
		const allocatedSubjects = subjectsRows.map(subject => ({
			id: subject.id,
			subjectName: subject.subjectName,
			examId: subject.examId,
			examType: subject.examType,
			topicCount: subject.topicCount || 0,
			questionCount: subject.questionCount || 0
		}));

		return res.status(200).json({
			success: true,
			faculty: {
				...faculty,
				allocatedSubjects
			}
		});
	} catch (error) {
		console.error('Error fetching faculty profile:', error);
		return res.status(500).json({
			success: false,
			message: 'Error fetching profile',
			error: error.message
		});
	}
};

// Update faculty profile
export const updateFacultyProfile = async (req, res) => {
	try {
		const facultyUserId = req.user?.id;
		const { name, phone } = req.body;

		if (!facultyUserId) {
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
			WHERE id = ? AND role_id = 2`,
			[name, phone, facultyUserId]
		);

		// Get updated profile
		const [updatedRows] = await connection.execute(
			`SELECT id, userid, name, email, phone, created_at as createdAt 
			FROM users 
			WHERE id = ?`,
			[facultyUserId]
		);

		connection.release();

		return res.status(200).json({
			success: true,
			message: 'Profile updated successfully',
			faculty: updatedRows[0]
		});
	} catch (error) {
		console.error('Error updating faculty profile:', error);
		return res.status(500).json({
			success: false,
			message: 'Error updating profile',
			error: error.message
		});
	}
};

// Helper function to format time ago
function formatTimeAgo(timestamp) {
	const now = new Date();
	const past = new Date(timestamp);
	const diffMs = now - past;
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 60) {
		return diffMins <= 1 ? 'just now' : `${diffMins} minutes ago`;
	} else if (diffHours < 24) {
		return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
	} else {
		return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
	}
}

export default {
	getFacultyStats,
	getRecentActivity,
	getPerformanceMetrics,
	changePassword,
	getFacultyProfile,
	updateFacultyProfile
};
