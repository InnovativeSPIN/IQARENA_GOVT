import pool from '../config/db.js';

/*
 * Admin <-> faculty messages.
 * - Admin -> faculty: sent to one or more schools (school_id) or to every school (school_id NULL).
 * - Faculty -> admin: stamped with the faculty's school.
 * Text is stored as utf8mb4 so Tamil (and any Unicode) is kept intact; an optional image can be attached as proof.
 */

export async function ensureMessageTables(connection) {
  await connection.query(
    `CREATE TABLE IF NOT EXISTS messages (
      id INT NOT NULL AUTO_INCREMENT,
      direction ENUM('to_faculty','to_admin') NOT NULL,
      sender_id INT NOT NULL,
      school_id INT NULL,
      subject VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      image_url VARCHAR(500) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_msg_dir_school (direction, school_id),
      KEY idx_msg_sender (sender_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
  await connection.query(
    `CREATE TABLE IF NOT EXISTS message_reads (
      message_id INT NOT NULL,
      user_id INT NOT NULL,
      read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (message_id, user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
}

const imageUrlFrom = (req) => (req.file ? `/uploads/messages/${req.file.filename}` : null);

const cleanText = (v, max) => String(v ?? '').trim().slice(0, max);

const MESSAGE_SELECT = `
  SELECT m.id, m.direction, m.subject, m.body, m.image_url AS imageUrl, m.created_at AS createdAt,
         m.school_id AS schoolId, sc.school_name AS schoolName,
         u.id AS senderId, u.name AS senderName,
         EXISTS(SELECT 1 FROM message_reads r WHERE r.message_id = m.id AND r.user_id = ?) AS isRead
  FROM messages m
  JOIN users u ON u.id = m.sender_id
  LEFT JOIN schools sc ON sc.id = m.school_id`;

const shape = (rows) => rows.map(r => ({ ...r, isRead: !!r.isRead }));

async function withConnection(res, handler) {
  const connection = await pool.getConnection();
  try {
    await ensureMessageTables(connection);
    await handler(connection);
  } catch (error) {
    console.error('Messages error:', error);
    if (!res.headersSent) res.status(500).json({ success: false, message: 'Server error', error: error.message });
  } finally {
    connection.release();
  }
}

// ---------------- Admin ----------------

// GET /api/admin/messages?box=inbox|sent&schoolId=
export const adminListMessages = (req, res) => withConnection(res, async (connection) => {
  const box = req.query.box === 'sent' ? 'sent' : 'inbox';
  const schoolId = Number(req.query.schoolId) || null;
  const clauses = [box === 'inbox' ? "m.direction = 'to_admin'" : "m.direction = 'to_faculty'"];
  const params = [req.user.id];
  if (schoolId) { clauses.push('m.school_id = ?'); params.push(schoolId); }
  const [rows] = await connection.query(`${MESSAGE_SELECT} WHERE ${clauses.join(' AND ')} ORDER BY m.created_at DESC, m.id DESC LIMIT 300`, params);
  const [[unread]] = await connection.query(
    `SELECT COUNT(*) AS n FROM messages m WHERE m.direction = 'to_admin'
       AND NOT EXISTS (SELECT 1 FROM message_reads r WHERE r.message_id = m.id AND r.user_id = ?)`,
    [req.user.id]
  );
  res.json({ success: true, messages: shape(rows), unread: Number(unread.n) });
});

// POST /api/admin/messages  (multipart: subject, body, schoolIds = "all" | "2,4", image?)
export const adminSendMessage = (req, res) => withConnection(res, async (connection) => {
  const subject = cleanText(req.body.subject, 255);
  const body = cleanText(req.body.body, 5000);
  if (!subject || !body) return res.status(400).json({ success: false, message: 'Subject and message are required' });

  const raw = String(req.body.schoolIds || 'all');
  const targets = raw === 'all' ? [null] : raw.split(',').map(Number).filter(Boolean);
  if (targets.length === 0) return res.status(400).json({ success: false, message: 'Choose at least one school' });

  const image = imageUrlFrom(req);
  for (const schoolId of targets) {
    await connection.query(
      "INSERT INTO messages (direction, sender_id, school_id, subject, body, image_url) VALUES ('to_faculty', ?, ?, ?, ?, ?)",
      [req.user.id, schoolId, subject, body, image]
    );
  }
  res.status(201).json({ success: true, sent: targets.length });
});

// ---------------- Faculty ----------------

async function facultySchoolId(connection, userId) {
  const [[row]] = await connection.query('SELECT school_id FROM users WHERE id = ?', [userId]);
  return row?.school_id || null;
}

// GET /api/faculty/messages?box=inbox|sent
export const facultyListMessages = (req, res) => withConnection(res, async (connection) => {
  const box = req.query.box === 'sent' ? 'sent' : 'inbox';
  const schoolId = await facultySchoolId(connection, req.user.id);
  let rows;
  if (box === 'inbox') {
    [rows] = await connection.query(
      `${MESSAGE_SELECT} WHERE m.direction = 'to_faculty' AND (m.school_id IS NULL OR m.school_id = ?) ORDER BY m.created_at DESC, m.id DESC LIMIT 300`,
      [req.user.id, schoolId]
    );
  } else {
    [rows] = await connection.query(
      `${MESSAGE_SELECT} WHERE m.direction = 'to_admin' AND m.sender_id = ? ORDER BY m.created_at DESC, m.id DESC LIMIT 300`,
      [req.user.id, req.user.id]
    );
  }
  const [[unread]] = await connection.query(
    `SELECT COUNT(*) AS n FROM messages m WHERE m.direction = 'to_faculty' AND (m.school_id IS NULL OR m.school_id = ?)
       AND NOT EXISTS (SELECT 1 FROM message_reads r WHERE r.message_id = m.id AND r.user_id = ?)`,
    [schoolId, req.user.id]
  );
  res.json({ success: true, messages: shape(rows), unread: Number(unread.n) });
});

// POST /api/faculty/messages  (multipart: subject, body, image?)
export const facultySendMessage = (req, res) => withConnection(res, async (connection) => {
  const subject = cleanText(req.body.subject, 255);
  const body = cleanText(req.body.body, 5000);
  if (!subject || !body) return res.status(400).json({ success: false, message: 'Subject and message are required' });
  const schoolId = await facultySchoolId(connection, req.user.id);
  await connection.query(
    "INSERT INTO messages (direction, sender_id, school_id, subject, body, image_url) VALUES ('to_admin', ?, ?, ?, ?, ?)",
    [req.user.id, schoolId, subject, body, imageUrlFrom(req)]
  );
  res.status(201).json({ success: true });
});

// ---------------- Shared ----------------

// PATCH /api/{admin|faculty}/messages/:id/read
export const markMessageRead = (req, res) => withConnection(res, async (connection) => {
  await connection.query('INSERT IGNORE INTO message_reads (message_id, user_id) VALUES (?, ?)', [Number(req.params.id), req.user.id]);
  res.json({ success: true });
});
