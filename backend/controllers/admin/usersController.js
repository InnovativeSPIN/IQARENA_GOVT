import pool from '../../config/db.js';
import bcrypt from 'bcryptjs';

// List all users 
export const listUsers = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT u.id, u.userid, u.name, u.phone, u.email, u.created_at, 
              CASE WHEN u.status = 1 THEN 'active' ELSE 'inactive' END as status, 
              r.name as role, b.batch_name as batchName, s.batch_id
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN batches b ON b.id = s.batch_id
       ORDER BY u.id DESC`
    );
    connection.release();
    return res.status(200).json({ success: true, users: rows });
  } catch (error) {
    console.error('Error listing users:', error);
    return res.status(500).json({ success: false, message: 'Error listing users', error: error.message });
  }
};

// GET /api/admin/users/:id - get single user by id
export const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT u.id, u.userid, u.name, u.phone, u.email, u.created_at, 
              CASE WHEN u.status = 1 THEN 'active' ELSE 'inactive' END as status, 
              r.name as role, b.batch_name as batchName, s.batch_id
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN batches b ON b.id = s.batch_id
       WHERE u.id = ?`,
      [id]
    );
    connection.release();

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, user: rows[0] });
  } catch (error) {
    console.error('Error fetching user by id:', error);
    return res.status(500).json({ success: false, message: 'Error fetching user', error: error.message });
  }
};

// Create a new user
export const createUser = async (req, res) => {
  const { userid, name, phone, email, role, password, batchId } = req.body;
  if (!userid || !name || !role) {
    return res.status(400).json({ success: false, message: 'userid, name and role are required' });
  }
  try {
    const connection = await pool.getConnection();
    const [roleRows] = await connection.execute('SELECT id FROM roles WHERE name = ?', [role.toUpperCase()]);
    if (roleRows.length === 0) {
      connection.release();
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    const roleId = roleRows[0].id;

    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE userid = ? OR email = ? OR phone = ?',
      [userid, email || null, phone || null]
    );
    if (existing.length > 0) {
      connection.release();
      return res.status(400).json({ success: false, message: 'User with provided userid/email/phone already exists' });
    }

    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Convert status to integer: 1 = active, 0 = inactive
    const statusValue = req.body.status === 'inactive' ? 0 : 1;
    
    const [result] = await connection.execute(
      'INSERT INTO users (userid, role_id, name, phone, email, password, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userid, roleId, name, phone || null, email || null, hashedPassword, statusValue]
    );

    const newUserId = result.insertId;
    if (role.toUpperCase() === 'STUDENT' && batchId) {
      // Get batch name to determine exam type
      const [batchRows] = await connection.execute('SELECT batch_name FROM batches WHERE id = ?', [batchId]);
      let examId = null;
      
      if (batchRows.length > 0) {
        const batchName = batchRows[0].batch_name.toLowerCase();
        // Determine exam based on batch name
        if (batchName.includes('neet')) {
          const [neetExam] = await connection.execute('SELECT id FROM exams WHERE name = "NEET"');
          if (neetExam.length > 0) examId = neetExam[0].id;
        } else if (batchName.includes('jee')) {
          const [jeeExam] = await connection.execute('SELECT id FROM exams WHERE name = "JEE"');
          if (jeeExam.length > 0) examId = jeeExam[0].id;
        }
      }
      
      // If no exam determined, use first available exam
      if (!examId) {
        const [defaultExam] = await connection.execute('SELECT id FROM exams LIMIT 1');
        if (defaultExam.length > 0) examId = defaultExam[0].id;
      }
      
      if (examId) {
        await connection.execute(
          'INSERT INTO students (user_id, batch_id, exam_id) VALUES (?, ?, ?)',
          [newUserId, batchId, examId]
        );
      }
    }

      const [rows] = await connection.execute(
        `SELECT u.id, u.userid, u.name, u.phone, u.email, u.created_at, 
                CASE WHEN u.status = 1 THEN 'active' ELSE 'inactive' END as status, 
                r.name as role, b.batch_name as batchName
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN batches b ON b.id = s.batch_id
       WHERE u.id = ?`,
      [newUserId]
    );
    connection.release();
    return res.status(201).json({ success: true, user: rows[0] });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ success: false, message: 'Error creating user', error: error.message });
  }
};

// Update user details
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { userid, name, phone, email, role, password, batchId, status } = req.body;
  try {
    const connection = await pool.getConnection();

    // Fetch current user
    const [existing] = await connection.execute('SELECT id, role_id FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let roleId = existing[0].role_id;
    if (role) {
      const [roleRows] = await connection.execute('SELECT id FROM roles WHERE name = ?', [role.toUpperCase()]);
      if (roleRows.length === 0) {
        connection.release();
        return res.status(400).json({ success: false, message: 'Invalid role' });
      }
      roleId = roleRows[0].id;
    }

    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Check for duplicates on userid/email/phone for update
    if (userid || email || phone) {
      const [dupe] = await connection.execute(
        'SELECT id FROM users WHERE (userid = ? OR email = ? OR phone = ?) AND id != ?',
        [userid || null, email || null, phone || null, id]
      );
      if (dupe.length > 0) {
        connection.release();
        return res.status(400).json({ success: false, message: 'User with provided userid/email/phone already exists' });
      }
    }

    // Convert status to integer: 1 = active, 0 = inactive
    let statusValue = null;
    if (status === 'active') statusValue = 1;
    if (status === 'inactive') statusValue = 0;
    
    await connection.execute(
      'UPDATE users SET userid = COALESCE(?, userid), name = COALESCE(?, name), phone = COALESCE(?, phone), email = COALESCE(?, email), role_id = ?, password = COALESCE(?, password), status = COALESCE(?, status) WHERE id = ?',
      [userid || null, name || null, phone || null, email || null, roleId, hashedPassword, statusValue, id]
    );

    if (role && role.toUpperCase() !== 'STUDENT') {
      await connection.execute('DELETE FROM students WHERE user_id = ?', [id]);
    } else if (role && role.toUpperCase() === 'STUDENT') {
      if (batchId) {
        const [batchRows] = await connection.execute('SELECT batch_name FROM batches WHERE id = ?', [batchId]);
        let examId = null;
        
        if (batchRows.length > 0) {
          const batchName = batchRows[0].batch_name.toLowerCase();
          if (batchName.includes('neet')) {
            const [neetExam] = await connection.execute('SELECT id FROM exams WHERE name = "NEET"');
            if (neetExam.length > 0) examId = neetExam[0].id;
          } else if (batchName.includes('jee')) {
            const [jeeExam] = await connection.execute('SELECT id FROM exams WHERE name = "JEE"');
            if (jeeExam.length > 0) examId = jeeExam[0].id;
          }
        }
        
        if (!examId) {
          const [defaultExam] = await connection.execute('SELECT id FROM exams LIMIT 1');
          if (defaultExam.length > 0) examId = defaultExam[0].id;
        }
        
        const [studentRows] = await connection.execute('SELECT id FROM students WHERE user_id = ?', [id]);
        if (studentRows.length === 0) {
          // Insert new student record
          if (examId) {
            await connection.execute(
              'INSERT INTO students (user_id, batch_id, exam_id) VALUES (?, ?, ?)',
              [id, batchId, examId]
            );
          }
        } else {
          // Update existing student record
          if (examId) {
            await connection.execute(
              'UPDATE students SET batch_id = ?, exam_id = ? WHERE user_id = ?',
              [batchId, examId, id]
            );
          } else {
            await connection.execute(
              'UPDATE students SET batch_id = ? WHERE user_id = ?',
              [batchId, id]
            );
          }
        }
      }
    }

    // Return updated user
    const [rows] = await connection.execute(
      `SELECT u.id, u.userid, u.name, u.phone, u.email, u.created_at, 
              CASE WHEN u.status = 1 THEN 'active' ELSE 'inactive' END as status, 
              r.name as role, b.batch_name as batchName
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN batches b ON b.id = s.batch_id
       WHERE u.id = ?`,
      [id]
    );
    connection.release();
    return res.status(200).json({ success: true, user: rows[0] });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ success: false, message: 'Error updating user', error: error.message });
  }
};

// Update only status
export const updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // expected 'active' or 'inactive'
  if (!status || (status !== 'active' && status !== 'inactive')) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }
  try {
    const connection = await pool.getConnection();
    const [existing] = await connection.execute('SELECT id FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    await connection.execute('UPDATE users SET status = ? WHERE id = ?', [status, id]);
    connection.release();
    return res.status(200).json({ success: true, message: `User status updated to ${status}` });
  } catch (err) {
    console.error('Error updating status', err);
    return res.status(500).json({ success: false, message: 'Error updating status', error: err.message });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const connection = await pool.getConnection();
    
    await connection.execute('DELETE FROM students WHERE user_id = ?', [id]);
    
    // Try deleting allocations from both possible allocation table names (legacy or new)
    try {
      await connection.execute('DELETE FROM subject_allocation WHERE faculty_user_id = ?', [id]);
    } catch (err) {
      // fallback to other naming convention
      try {
        await connection.execute('DELETE FROM faculty_subject_allocation WHERE faculty_user_id = ?', [id]);
      } catch (err2) {
        console.log('No allocation table found or delete failed (subject_allocation / faculty_subject_allocation):', err2.message);
      }
    }
    
    await connection.execute('DELETE FROM users WHERE id = ?', [id]);
    
    connection.release();
    return res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ success: false, message: 'Error deleting user', error: error.message });
  }
};

// Admin utility: Fix inconsistent user roles based on students and allocations
export const fixUserRoles = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Get the role ids
    const [roles] = await connection.execute('SELECT id, name FROM roles');
    const roleMap = roles.reduce((acc, r) => ({ ...acc, [String(r.name).toUpperCase()]: r.id }), {});
    const adminRoleId = roleMap['ADMIN'];
    const facultyRoleId = roleMap['FACULTY'];
    const studentRoleId = roleMap['STUDENT'];
    if (!facultyRoleId || !studentRoleId) {
      connection.release();
      return res.status(500).json({ success: false, message: 'Required roles not found in roles table' });
    }

    // 1. All users present in students table -> STUDENT
    const [studentRows] = await connection.execute('SELECT DISTINCT user_id FROM students');
    const studentIds = studentRows.map((r) => String(r.user_id));
    let updatedToStudent = 0;
    if (studentIds.length > 0) {
      const placeholders = studentIds.map(() => '?').join(',');
      const [resUpdate] = await connection.execute(`UPDATE users SET role_id = ? WHERE id IN (${placeholders})`, [studentRoleId, ...studentIds]);
      updatedToStudent = resUpdate.affectedRows || 0;
    }

    // 2. All users present in allocation tables -> FACULTY (but skip those already students)
    // Try both allocation tables
    const allocationUserIds = new Set();
    try {
      const [allocRows] = await connection.execute('SELECT DISTINCT faculty_user_id FROM subject_allocation');
      allocRows.forEach((r) => allocationUserIds.add(String(r.faculty_user_id)));
    } catch (err) {
      // ignore, table may not exist
    }
    try {
      const [allocRows2] = await connection.execute('SELECT DISTINCT faculty_user_id FROM faculty_subject_allocation');
      allocRows2.forEach((r) => allocationUserIds.add(String(r.faculty_user_id)));
    } catch (err) {
      // ignore
    }

    const allocIds = Array.from(allocationUserIds).filter((id) => !studentIds.includes(id));
    let updatedToFaculty = 0;
    if (allocIds.length > 0) {
      const placeholders2 = allocIds.map(() => '?').join(',');
      const [resUpdate2] = await connection.execute(`UPDATE users SET role_id = ? WHERE id IN (${placeholders2})`, [facultyRoleId, ...allocIds]);
      updatedToFaculty = resUpdate2.affectedRows || 0;
    }

    await connection.commit();
    connection.release();
    return res.status(200).json({ success: true, message: 'User roles reconciled', updatedToStudent, updatedToFaculty });
  } catch (error) {
    console.error('Error reconciling user roles', error);
    try {
      if (connection) await connection.rollback();
    } catch (err) {
      console.error('Rollback failed', err);
    }
    if (connection) connection.release();
    return res.status(500).json({ success: false, message: 'Error reconciling user roles', error: error.message });
  }
};

// Reset user password
export const resetPassword = async (req, res) => {
  const { id } = req.params;
  const defaultPassword = '203040';
  
  try {
    const connection = await pool.getConnection();
    
    // Check if user exists
    const [existing] = await connection.execute('SELECT id, name FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Hash the default password
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    // Update only the password
    await connection.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
    
    connection.release();
    return res.status(200).json({ 
      success: true, 
      message: `Password reset to ${defaultPassword} for user ${existing[0].name}` 
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(500).json({ success: false, message: 'Error resetting password', error: error.message });
  }
};

export default {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
};
