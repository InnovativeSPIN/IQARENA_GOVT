import pool from '../../config/db.js';

// Ensure allocation table exists; create it if missing
const ensureAllocationTableExists = async (connection) => {
  try {
    await connection.execute(`CREATE TABLE IF NOT EXISTS subject_allocation (
      id INT PRIMARY KEY AUTO_INCREMENT,
      faculty_user_id INT NOT NULL,
      subject_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_faculty_subject (faculty_user_id, subject_id),
      FOREIGN KEY (faculty_user_id) REFERENCES users(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id)
    )`);
    return true;
  } catch (err) {
    console.error('Error ensuring allocation table exists', err);
    return false;
  }
};

// Ensure NEET and JEE exams exist in exams table
const ensureExamsExist = async (connection) => {
  try {
    // Insert NEET and JEE if they do not exist
    await connection.execute("INSERT INTO exams (name) SELECT 'NEET' WHERE NOT EXISTS (SELECT 1 FROM exams WHERE name = 'NEET')");
    await connection.execute("INSERT INTO exams (name) SELECT 'JEE' WHERE NOT EXISTS (SELECT 1 FROM exams WHERE name = 'JEE')");
    return true;
  } catch (err) {
    console.error('Error ensuring exams exist', err);
    return false;
  }
};

export const listSubjects = async (req, res) => {
  const { exam } = req.query; // exam is a name 'NEET' or 'JEE'
  try {
    const connection = await pool.getConnection();
    await ensureExamsExist(connection);
    await ensureExamsExist(connection);
    const params = [];
    let where = '';
    if (exam) {
      where = 'WHERE e.name = ?';
      params.push(exam);
    }

    const [rows] = await connection.execute(
      `SELECT s.id, s.name, e.name as examType, CASE WHEN s.status = 1 THEN 'active' ELSE 'inactive' END as status, 
              COALESCE(topic_counts.topicCount, 0) AS topicCount
       FROM subjects s
       LEFT JOIN exams e ON e.id = s.exam_id
       LEFT JOIN (
         SELECT subject_id, COUNT(*) as topicCount FROM topics GROUP BY subject_id
       ) topic_counts ON topic_counts.subject_id = s.id
       ${where}
       ORDER BY s.id DESC`,
      params
    );
    connection.release();
    return res.status(200).json({ success: true, subjects: rows });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return res.status(500).json({ success: false, message: 'Error fetching subjects', error: error.message });
  }
};

// Create a new subject
export const createSubject = async (req, res) => {
  const { name, examType } = req.body;
  if (!name || !examType) {
    return res.status(400).json({ success: false, message: 'name and examType are required' });
  }
  try {
    const connection = await pool.getConnection();
    // convert examType to exam_id
    const [examRows] = await connection.execute('SELECT id FROM exams WHERE name = ?', [examType]);
    if (examRows.length === 0) {
      connection.release();
      return res.status(400).json({ success: false, message: 'Invalid examType' });
    }
    const examId = examRows[0].id;
    const [existing] = await connection.execute('SELECT id FROM subjects WHERE name = ? AND exam_id = ?', [name, examId]);
    if (existing.length > 0) {
      connection.release();
      return res.status(400).json({ success: false, message: 'Subject already exists for the selected exam' });
    }
    const [result] = await connection.execute('INSERT INTO subjects (name, exam_id, status) VALUES (?, ?, ?)', [name, examId, 1]);
    const newId = result.insertId;
    const [rows] = await connection.execute('SELECT s.id, s.name, e.name as examType, CASE WHEN s.status = 1 THEN \"active\" ELSE \"inactive\" END as status FROM subjects s JOIN exams e ON e.id = s.exam_id WHERE s.id = ?', [newId]);
    connection.release();
    return res.status(201).json({ success: true, subject: rows[0] });
  } catch (error) {
    console.error('Error creating subject:', error);
    return res.status(500).json({ success: false, message: 'Error creating subject', error: error.message });
  }
};

export const updateSubject = async (req, res) => {
  const { id } = req.params;
  const { name, status } = req.body;
  if (!name && !status) {
    return res.status(400).json({ success: false, message: 'name or status is required to update' });
  }
  try {
    const connection = await pool.getConnection();
    const [existing] = await connection.execute('SELECT id, name, exam_id FROM subjects WHERE id = ?', [id]);
    if (existing.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    if (name && name !== existing[0].name) {
      const [dupe] = await connection.execute('SELECT id FROM subjects WHERE name = ? AND exam_id = ? AND id != ?', [name, existing[0].exam_id, id]);
      if (dupe.length > 0) {
        connection.release();
        return res.status(400).json({ success: false, message: 'Another subject with this name exists for this exam' });
      }
    }
    // convert status string to numeric
    let statusVal = null;
    if (status === 'active') statusVal = 1;
    if (status === 'inactive') statusVal = 0;
    await connection.execute('UPDATE subjects SET name = COALESCE(?, name), status = COALESCE(?, status) WHERE id = ?', [name || null, statusVal !== null ? statusVal : null, id]);
    const [rows] = await connection.execute('SELECT s.id, s.name, e.name as examType, CASE WHEN s.status = 1 THEN \"active\" ELSE \"inactive\" END as status FROM subjects s JOIN exams e ON e.id = s.exam_id WHERE s.id = ?', [id]);
    connection.release();
    return res.status(200).json({ success: true, subject: rows[0] });
  } catch (error) {
    console.error('Error updating subject:', error);
    return res.status(500).json({ success: false, message: 'Error updating subject', error: error.message });
  }
};

export const deleteSubject = async (req, res) => {
  const { id } = req.params;
  try {
    const connection = await pool.getConnection();
    const [existing] = await connection.execute('SELECT id FROM subjects WHERE id = ?', [id]);
    if (existing.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }
    const [topics] = await connection.execute('SELECT id FROM topics WHERE subject_id = ?', [id]);
    if (topics.length > 0) {
      connection.release();
      return res.status(400).json({ success: false, message: 'Cannot delete subject with existing topics' });
    }
    let allocations = [];
    try {
      const [allocRows] = await connection.execute('SELECT id FROM subject_allocation WHERE subject_id = ?', [id]);
      allocations = allocRows;
    } catch (err) {
      if (err && (err.code === 'ER_NO_SUCH_TABLE' || err.errno === 1146)) {
        console.warn('subject_allocation table missing; treating as no allocations');
        allocations = [];
      } else {
        connection.release();
        console.error('Error checking allocations', err);
        return res.status(500).json({ success: false, message: 'Error checking allocations', error: err.message });
      }
    }
    if (allocations.length > 0) {
      connection.release();
      return res.status(400).json({ success: false, message: 'Cannot delete subject with assigned faculty' });
    }
    await connection.execute('DELETE FROM subjects WHERE id = ?', [id]);
    connection.release();
    return res.status(200).json({ success: true, message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    return res.status(500).json({ success: false, message: 'Error deleting subject', error: error.message });
  }
};

// List faculty allocated to a subject
export const getSubjectAllocations = async (req, res) => {
  const { id } = req.params; // subject id
  try {
    const connection = await pool.getConnection();
    // Try fetching from both allocation tables, unify result
    let rows = [];
    try {
      const [r] = await connection.execute(
        `SELECT a.subject_id as subjectId, a.id as id, u.id as facultyId, u.name as facultyName, u.email as facultyEmail
         FROM subject_allocation a
         JOIN users u ON u.id = a.faculty_user_id
         WHERE a.subject_id = ?`,
        [id]
      );
      rows = rows.concat(r);
    } catch (e) {
      if (!(e && (e.code === 'ER_NO_SUCH_TABLE' || e.errno === 1146))) {
        throw e;
      }
    }
    try {
      const [r2] = await connection.execute(
        `SELECT a.subject_id as subjectId, a.id as id, u.id as facultyId, u.name as facultyName, u.email as facultyEmail
         FROM faculty_subject_allocation a
         JOIN users u ON u.id = a.faculty_user_id
         WHERE a.subject_id = ?`,
        [id]
      );
      rows = rows.concat(r2);
    } catch (e) {
      if (!(e && (e.code === 'ER_NO_SUCH_TABLE' || e.errno === 1146))) {
        throw e;
      }
    }
    connection.release();
    return res.status(200).json({ success: true, allocations: rows });
  } catch (error) {
    console.error('Error fetching allocations:', error);
    if (error && (error.code === 'ER_NO_SUCH_TABLE' || error.errno === 1146)) {
      try {
        const ensureConn = await pool.getConnection();
        await ensureAllocationTableExists(ensureConn);
        ensureConn.release();
      } catch (err) {
        console.error('Error creating allocation table during fetch', err);
      }
      return res.status(200).json({ success: true, allocations: [] });
    }
    return res.status(500).json({ success: false, message: 'Error fetching allocations', error: error.message });
  }
};

// List all allocations across subjects
export const getAllAllocations = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    let rows = [];
    // try both tables
    try {
      const [r1] = await connection.execute(
        `SELECT a.id as id, a.subject_id as subjectId, a.faculty_user_id as facultyId, u.name as facultyName, u.email as facultyEmail, a.created_at
         FROM subject_allocation a
         JOIN users u ON u.id = a.faculty_user_id`
      );
      rows = rows.concat(r1);
    } catch (e) {
      if (!(e && (e.code === 'ER_NO_SUCH_TABLE' || e.errno === 1146))) {
        throw e;
      }
    }
    try {
      const [r2] = await connection.execute(
        `SELECT a.id as id, a.subject_id as subjectId, a.faculty_user_id as facultyId, u.name as facultyName, u.email as facultyEmail, a.created_at
         FROM faculty_subject_allocation a
         JOIN users u ON u.id = a.faculty_user_id`
      );
      rows = rows.concat(r2);
    } catch (e) {
      if (!(e && (e.code === 'ER_NO_SUCH_TABLE' || e.errno === 1146))) {
        throw e;
      }
    }
    connection.release();
    return res.status(200).json({ success: true, allocations: rows });
  } catch (error) {
    console.error('Error fetching all allocations:', error);
    // If allocation table missing, create it and return empty
    if (error && (error.code === 'ER_NO_SUCH_TABLE' || error.errno === 1146)) {
      try {
        const ensureConn = await pool.getConnection();
        await ensureAllocationTableExists(ensureConn);
        ensureConn.release();
      } catch (err) {
        console.error('Error creating allocation table during all allocations fetch', err);
      }
      return res.status(200).json({ success: true, allocations: [] });
    }
    return res.status(500).json({ success: false, message: 'Error fetching allocations', error: error.message });
  }
};

// List users with role = faculty
export const listFaculty = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT u.id as id, u.userid, u.name, u.email
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE LOWER(r.name) = 'faculty'`);
    connection.release();
    return res.status(200).json({ success: true, faculty: rows });
  } catch (error) {
    console.error('Error listing faculty:', error);
    return res.status(500).json({ success: false, message: 'Error listing faculty', error: error.message });
  }
};

export const setSubjectAllocations = async (req, res) => {
  const { id } = req.params;
  const { facultyIds } = req.body;
  if (!Array.isArray(facultyIds)) {
    return res.status(400).json({ success: false, message: 'facultyIds must be an array of user ids' });
  }
  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    const [existing] = await connection.execute('SELECT id FROM subjects WHERE id = ?', [id]);
    if (existing.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    // Delete old allocations - ensure table exists first
      try {
        await ensureAllocationTableExists(connection);
        await connection.execute('DELETE FROM subject_allocation WHERE subject_id = ?', [id]);
      } catch (err) {
        console.error('Error deleting allocations', err);
        await connection.rollback();
        connection.release();
        return res.status(500).json({ success: false, message: 'Error deleting allocations', error: err.message });
      }
      // Also delete from legacy table if exists
      try {
        await connection.execute('DELETE FROM faculty_subject_allocation WHERE subject_id = ?', [id]);
      } catch (err) {
        // ignore missing table
      }

  
    const uniqueFacultyIds = Array.from(new Set(facultyIds.map((f) => String(f).trim()))).filter(Boolean);
    let validFacultyIds = uniqueFacultyIds;
    if (uniqueFacultyIds.length > 0) {
      const placeholders = uniqueFacultyIds.map(() => '?').join(',');

      // Get faculty role id
      const [facultyRoleRows] = await connection.execute('SELECT id FROM roles WHERE name = ?', ['FACULTY']);
      const facultyRoleId = facultyRoleRows && facultyRoleRows.length ? facultyRoleRows[0].id : null;

      // Get users and their current roles for the provided ids
      const [validRows] = await connection.execute(
        `SELECT u.id, LOWER(r.name) as roleName FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id IN (${placeholders})`,
        uniqueFacultyIds
      );

      const foundIds = validRows.map((r) => String(r.id));
      // Convert users who are not faculty or admin to faculty
      const toConvert = validRows.filter((r) => r.roleName !== 'faculty' && r.roleName !== 'admin' && facultyRoleId !== null).map((r) => r.id);
      if (toConvert.length > 0) {
        const convertPlaceholders = toConvert.map(() => '?').join(',');
        await connection.execute(`UPDATE users SET role_id = ? WHERE id IN (${convertPlaceholders})`, [facultyRoleId, ...toConvert]);
      }

      // Only include ids that actually exist in the users table
      validFacultyIds = uniqueFacultyIds.filter((id) => foundIds.includes(id));
    }

    if (validFacultyIds.length > 0) {
      const insertValues = validFacultyIds.map((fid) => [fid, id]);
      try {
        await connection.query('INSERT INTO subject_allocation (faculty_user_id, subject_id) VALUES ?', [insertValues]);
      } catch (err) {
        console.error('Error inserting allocations', err);
        await connection.rollback();
        connection.release();
        return res.status(500).json({ success: false, message: 'Error inserting allocations', error: err.message });
      }
      // Also insert into legacy table for compatibility if exists
      try {
        await connection.query('INSERT INTO faculty_subject_allocation (faculty_user_id, subject_id) VALUES ?', [insertValues]);
      } catch (err) {
        // If the legacy table is missing, ignore
      }
    }

    await connection.commit();
    connection.release();
    return res.status(200).json({ success: true, message: 'Allocations updated successfully' });
  } catch (error) {
    console.error('Error setting allocations:', error);
    return res.status(500).json({ success: false, message: 'Error setting allocations', error: error.message });
  }
};

export default {
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getSubjectAllocations,
  setSubjectAllocations,
  getAllAllocations,
  listFaculty,
};

