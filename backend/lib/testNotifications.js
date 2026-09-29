import pool from '../config/db.js';

// tests.standard holds a comma-separated list of classes (e.g. "VII,XI"); NULL = all classes
export async function ensureTestStandardColumn(connection) {
  const [cols] = await connection.query("SHOW COLUMNS FROM tests LIKE 'standard'");
  if (cols.length === 0) {
    await connection.query('ALTER TABLE tests ADD COLUMN standard VARCHAR(255) NULL DEFAULT NULL');
  } else if (!/varchar\(255\)/i.test(cols[0].Type)) {
    await connection.query('ALTER TABLE tests MODIFY COLUMN standard VARCHAR(255) NULL DEFAULT NULL');
  }
}

export async function ensureNotificationsTable(connection) {
  await connection.query(
    `CREATE TABLE IF NOT EXISTS notifications (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      test_id INT NULL,
      type VARCHAR(30) NOT NULL DEFAULT 'announcement',
      title VARCHAR(255) NOT NULL,
      message TEXT NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_notif_user (user_id),
      UNIQUE KEY uniq_notif_user_test_type (user_id, test_id, type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
  // popup_shown: the dashboard "new test assigned" popup has been shown for this notification
  const [cols] = await connection.query("SHOW COLUMNS FROM notifications LIKE 'popup_shown'");
  if (cols.length === 0) {
    await connection.query('ALTER TABLE notifications ADD COLUMN popup_shown TINYINT(1) NOT NULL DEFAULT 0');
  }
}

const parseSchoolIds = (raw) => {
  if (!raw) return [];
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr.map(Number).filter(Boolean) : [];
  } catch {
    return [];
  }
};

/**
 * Notify every linked school student whose school and class match the test.
 * Empty school list = all schools; empty class list = all classes.
 * Safe to call repeatedly: a student is notified once per test.
 */
export async function notifyStudentsForTest(testId) {
  const connection = await pool.getConnection();
  try {
    await ensureTestStandardColumn(connection);
    await ensureNotificationsTable(connection);

    const [[test]] = await connection.query(
      'SELECT id, title, exam_id, school_ids, standard, start_time, end_time, duration_minutes FROM tests WHERE id = ?',
      [testId]
    );
    if (!test) return 0;

    const schoolIds = parseSchoolIds(test.school_ids);
    const standards = (test.standard || '').split(',').map(s => s.trim()).filter(Boolean);

    const clauses = ['ss.user_id IS NOT NULL', 'ss.status = 1'];
    const params = [];
    if (schoolIds.length > 0) {
      clauses.push(`ss.school_id IN (${schoolIds.map(() => '?').join(',')})`);
      params.push(...schoolIds);
    }
    if (standards.length > 0) {
      clauses.push(`ss.standard IN (${standards.map(() => '?').join(',')})`);
      params.push(...standards);
    }
    if (test.exam_id) {
      clauses.push('(ss.exam_id = ? OR ss.exam_id IS NULL)');
      params.push(test.exam_id);
    }

    const [students] = await connection.query(
      `SELECT DISTINCT ss.user_id FROM school_students ss WHERE ${clauses.join(' AND ')}`,
      params
    );
    if (students.length === 0) return 0;

    const when = test.start_time
      ? `Starts ${new Date(test.start_time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`
      : 'Available now';
    const message = `${when} • ${test.duration_minutes || 0} minutes. Open Assigned Tests to take it.`;

    const values = students.map(s => [s.user_id, test.id, 'exam_reminder', `New test: ${test.title}`, message]);
    const [result] = await connection.query(
      'INSERT IGNORE INTO notifications (user_id, test_id, type, title, message) VALUES ?',
      [values]
    );
    return result.affectedRows || 0;
  } finally {
    connection.release();
  }
}
