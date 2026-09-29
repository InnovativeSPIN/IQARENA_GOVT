import pool from '../../config/db.js';
import { ensureNotificationsTable } from '../../lib/testNotifications.js';

export const listNotifications = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await ensureNotificationsTable(connection);
    const [rows] = await connection.query(
      `SELECT id, test_id AS testId, type, title, message, is_read AS isRead, created_at AS createdAt
       FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 200`,
      [req.user.id]
    );
    return res.status(200).json({ success: true, notifications: rows.map(r => ({ ...r, isRead: !!r.isRead })) });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ success: false, message: 'Error fetching notifications', error: error.message });
  } finally {
    connection.release();
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    await pool.execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error updating notification', error: error.message });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    await pool.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error updating notifications', error: error.message });
  }
};

// Tests assigned to the student whose popup has not been shown yet (still published and not yet ended)
export const listPendingTestPopups = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await ensureNotificationsTable(connection);
    const [rows] = await connection.query(
      `SELECT n.id AS notificationId, t.id AS testId, t.title, t.start_time AS startTime, t.end_time AS endTime,
              t.duration_minutes AS duration, e.name AS examName, s.name AS subjectName,
              (SELECT COUNT(*) FROM test_questions tq WHERE tq.test_id = t.id) AS questions
       FROM notifications n
       JOIN tests t ON t.id = n.test_id AND t.status = 'published'
       JOIN exams e ON e.id = t.exam_id
       LEFT JOIN subjects s ON s.id = t.subject_id
       LEFT JOIN student_test_attempts sta ON sta.test_id = t.id AND sta.student_id = n.user_id AND sta.status = 'completed'
       WHERE n.user_id = ? AND n.popup_shown = 0 AND n.type = 'exam_reminder'
         AND sta.id IS NULL
         AND (t.end_time IS NULL OR t.end_time > NOW())
       ORDER BY COALESCE(t.start_time, n.created_at)`,
      [req.user.id]
    );
    return res.status(200).json({ success: true, tests: rows });
  } catch (error) {
    console.error('Error fetching test popups:', error);
    return res.status(500).json({ success: false, message: 'Error fetching test popups', error: error.message });
  } finally {
    connection.release();
  }
};

// Mark popups as shown so they appear only once
export const markTestPopupsShown = async (req, res) => {
  const ids = Array.isArray(req.body?.notificationIds) ? req.body.notificationIds.map(Number).filter(Boolean) : [];
  if (ids.length === 0) return res.status(200).json({ success: true });
  try {
    await pool.query('UPDATE notifications SET popup_shown = 1 WHERE user_id = ? AND id IN (?)', [req.user.id, ids]);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error updating popups', error: error.message });
  }
};
