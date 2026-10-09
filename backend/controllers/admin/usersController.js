import pool from '../../config/db.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import csvParser from 'csv-parser';

// List all users + unlinked school_students (bulk-uploaded students with no user account)
export const listUsers = async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // 1. Fetch real users (with school_students join for student details)
    const [userRows] = await connection.execute(
      `SELECT u.id, u.userid, u.school_id, u.name, u.phone, u.email, u.created_at,
              CASE WHEN u.status = 1 THEN 'active' ELSE 'inactive' END as status,
              r.name as role, ss.standard, ss.section, ss.batch_year, ss.exam_id,
              e.name as exam_name, ss.emis_no, ss.id as school_student_id,
              sc.school_name, NULL as is_unlinked
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN school_students ss ON ss.user_id = u.id
       LEFT JOIN exams e ON e.id = ss.exam_id
       LEFT JOIN schools sc ON sc.id = COALESCE(ss.school_id, u.school_id)
       ORDER BY u.id DESC`
    );

    // 2. Fetch school_students that have NO linked user account
    const [unlinkedRows] = await connection.execute(
      `SELECT ss.id as school_student_id, ss.emis_no, ss.student_name as name,
              ss.phone, ss.school_id, ss.standard, ss.section, ss.batch_year, ss.exam_id,
              e.name as exam_name, sc.school_name,
              NULL as id, ss.emis_no as userid, NULL as email,
              ss.created_at, 'active' as status, 'STUDENT' as role,
              1 as is_unlinked
       FROM school_students ss
       LEFT JOIN exams e ON e.id = ss.exam_id
       LEFT JOIN schools sc ON sc.id = ss.school_id
       WHERE ss.user_id IS NULL
       ORDER BY ss.id DESC`
    );

    connection.release();

    // Combine: real users first, then unlinked school students
    // Use negative IDs for unlinked records so they don't clash
    const unlinkedMapped = unlinkedRows.map((r) => ({
      ...r,
      id: `ss_${r.school_student_id}`, // prefix to distinguish
      school_id: r.school_id,
    }));

    return res.status(200).json({ success: true, users: [...userRows, ...unlinkedMapped] });
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
      `SELECT u.id, u.userid, u.school_id, u.name, u.phone, u.email, u.created_at, 
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
  const { userid, name, phone, email, role, password, batchId, school_id } = req.body;
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

    // Check if userid already exists
    const [existingUserid] = await connection.execute(
      'SELECT id FROM users WHERE userid = ?',
      [userid]
    );
    if (existingUserid.length > 0) {
      connection.release();
      return res.status(400).json({ success: false, message: `User ID "${userid}" is already registered` });
    }

    // Check email uniqueness only if provided
    if (email && email.trim()) {
      const [existingEmail] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [email.trim()]
      );
      if (existingEmail.length > 0) {
        connection.release();
        return res.status(400).json({ success: false, message: `Email "${email}" is already registered` });
      }
    }

    const rawPassword = password || '203040';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Convert status to integer: 1 = active, 0 = inactive
    const statusValue = req.body.status === 'inactive' ? 0 : 1;
    
    const [result] = await connection.execute(
      'INSERT INTO users (userid, role_id, school_id, name, phone, email, password, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        userid,
        roleId,
        (role.toUpperCase() === 'FACULTY' || role.toUpperCase() === 'STUDENT') ? (school_id || null) : null,
        name,
        phone || null,
        email || null,
        hashedPassword,
        statusValue
      ]
    );

    const newUserId = result.insertId;
    if (role.toUpperCase() === 'STUDENT') {
      const { standard, section, batch_year, exam_id } = req.body;
      if (school_id && standard && batch_year) {
        await connection.execute(
          `INSERT INTO school_students (user_id, school_id, emis_no, student_name, phone, standard, section, batch_year, exam_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             user_id = VALUES(user_id),
             school_id = VALUES(school_id),
             student_name = VALUES(student_name),
             phone = COALESCE(VALUES(phone), phone),
             standard = VALUES(standard),
             section = COALESCE(VALUES(section), section),
             batch_year = VALUES(batch_year),
             exam_id = COALESCE(VALUES(exam_id), exam_id)`,
          [newUserId, school_id, userid, name, phone || null, standard, section || null, batch_year, exam_id || null]
        );
      }
    }

    const [rows] = await connection.execute(
      `SELECT u.id, u.userid, u.school_id, u.name, u.phone, u.email, u.created_at, 
              CASE WHEN u.status = 1 THEN 'active' ELSE 'inactive' END as status, 
              r.name as role, ss.standard, ss.section, ss.batch_year, ss.exam_id, e.name as exam_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN school_students ss ON ss.user_id = u.id
       LEFT JOIN exams e ON e.id = ss.exam_id
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
  const { userid, name, phone, email, role, password, batchId, status, school_id } = req.body;

  // Handle unlinked student records (prefixed with ss_)
  if (String(id).startsWith('ss_')) {
    const ssId = String(id).replace('ss_', '');
    try {
      const connection = await pool.getConnection();
      const { standard, section, batch_year, exam_id } = req.body;
      await connection.execute(
        `UPDATE school_students 
         SET emis_no = COALESCE(?, emis_no),
             student_name = COALESCE(?, student_name),
             phone = COALESCE(?, phone),
             school_id = COALESCE(?, school_id),
             standard = COALESCE(?, standard),
             section = COALESCE(?, section),
             batch_year = COALESCE(?, batch_year),
             exam_id = COALESCE(?, exam_id)
         WHERE id = ?`,
        [userid || null, name || null, phone || null, school_id || null, standard || null, section || null, batch_year || null, exam_id || null, ssId]
      );
      connection.release();
      return res.status(200).json({ success: true, message: 'Student updated successfully' });
    } catch (err) {
      console.error('Error updating unlinked student:', err);
      return res.status(500).json({ success: false, message: 'Error updating student', error: err.message });
    }
  }

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

    // Check for duplicate userid
    if (userid) {
      const [dupeUserid] = await connection.execute(
        'SELECT id FROM users WHERE userid = ? AND id != ?',
        [userid, id]
      );
      if (dupeUserid.length > 0) {
        connection.release();
        return res.status(400).json({ success: false, message: `User ID "${userid}" is already taken` });
      }
    }

    // Check for duplicate email if provided
    if (email && email.trim()) {
      const [dupeEmail] = await connection.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email.trim(), id]
      );
      if (dupeEmail.length > 0) {
        connection.release();
        return res.status(400).json({ success: false, message: `Email "${email}" is already taken` });
      }
    }

    // Convert status to integer: 1 = active, 0 = inactive
    let statusValue = null;
    if (status === 'active') statusValue = 1;
    if (status === 'inactive') statusValue = 0;
    
    await connection.execute(
      'UPDATE users SET userid = COALESCE(?, userid), name = COALESCE(?, name), phone = COALESCE(?, phone), email = COALESCE(?, email), role_id = ?, school_id = ?, password = COALESCE(?, password), status = COALESCE(?, status) WHERE id = ?',
      [
        userid || null,
        name || null,
        phone || null,
        email || null,
        roleId,
        (role && (role.toUpperCase() === 'FACULTY' || role.toUpperCase() === 'STUDENT')) ? (school_id || null) : null,
        hashedPassword,
        statusValue,
        id
      ]
    );

    if (role && role.toUpperCase() !== 'STUDENT') {
      await connection.execute('DELETE FROM school_students WHERE user_id = ?', [id]);
    } else if (role && role.toUpperCase() === 'STUDENT') {
      const { standard, section, batch_year, exam_id } = req.body;
      if (school_id && standard && batch_year) {
        await connection.execute(
          `INSERT INTO school_students (user_id, school_id, emis_no, student_name, phone, standard, section, batch_year, exam_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             user_id = VALUES(user_id),
             school_id = VALUES(school_id),
             student_name = VALUES(student_name),
             phone = COALESCE(VALUES(phone), phone),
             standard = VALUES(standard),
             section = COALESCE(VALUES(section), section),
             batch_year = VALUES(batch_year),
             exam_id = COALESCE(VALUES(exam_id), exam_id)`,
          [id, school_id, userid, name, phone || null, standard, section || null, batch_year, exam_id || null]
        );
      }
    }

    // Return updated user
    const [rows] = await connection.execute(
      `SELECT u.id, u.userid, u.school_id, u.name, u.phone, u.email, u.created_at, 
              CASE WHEN u.status = 1 THEN 'active' ELSE 'inactive' END as status, 
              r.name as role, ss.standard, ss.section, ss.batch_year, ss.exam_id, e.name as exam_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN school_students ss ON ss.user_id = u.id
       LEFT JOIN exams e ON e.id = ss.exam_id
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
    await connection.execute('UPDATE users SET status = ? WHERE id = ?', [status === 'active' ? 1 : 0, id]);
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
    
    if (String(id).startsWith('ss_')) {
      const ssId = String(id).replace('ss_', '');
      await connection.execute('DELETE FROM school_students WHERE id = ?', [ssId]);
      connection.release();
      return res.status(200).json({ success: true, message: 'Student deleted successfully' });
    }

    await connection.execute('DELETE FROM students WHERE user_id = ?', [id]);
    await connection.execute('DELETE FROM school_students WHERE user_id = ?', [id]);
    
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

export const importFaculty = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No CSV file uploaded' });
    }

    const results = [];
    fs.createReadStream(req.file.path)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        let imported = 0;
        let skipped = 0;
        const errors = [];
        
        const defaultPassword = await bcrypt.hash('203040', 10);

        for (let i = 0; i < results.length; i++) {
          const row = results[i];
          const udise_code = row.udise_code?.trim() || row.emis_no?.trim() || row.umis_id?.trim();
          const faculty_name = row.faculty_name?.trim() || row.name?.trim();
          const phone = row.phone?.trim() || null;
          const email = row.email?.trim() || null;
          
          if (!udise_code || !faculty_name) {
            skipped++;
            errors.push(`Row ${i + 2}: Missing required fields (udise_code or faculty_name)`);
            continue;
          }

          try {
            // Find school
            const [schools] = await pool.query('SELECT id FROM schools WHERE udise_code = ?', [udise_code]);
            if (schools.length === 0) {
              skipped++;
              errors.push(`Row ${i + 2}: School with UDISE code ${udise_code} not found`);
              continue;
            }
            const school_id = schools[0].id;
            
            // For userid, use phone if available, else generate
            const userid = phone || `FAC_${udise_code}_${Date.now()}_${i}`;

            // Check if user already exists
            const [existingUser] = await pool.query('SELECT id FROM users WHERE userid = ?', [userid]);
            
            if (existingUser.length > 0) {
              await pool.query(
                'UPDATE users SET name = ?, phone = ?, email = ?, school_id = ? WHERE id = ?',
                [faculty_name, phone, email, school_id, existingUser[0].id]
              );
            } else {
              await pool.query(
                'INSERT INTO users (userid, name, phone, email, password, role_id, school_id, status) VALUES (?, ?, ?, ?, ?, 4, ?, 1)',
                [userid, faculty_name, phone, email, defaultPassword, school_id]
              );
            }
            imported++;
          } catch (err) {
            console.error(`Error importing row ${i + 2}:`, err);
            skipped++;
            errors.push(`Row ${i + 2}: Database error - ${err.message}`);
          }
        }

        // Clean up the uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
          success: true,
          message: `Faculty Import complete. Imported/Updated: ${imported}. Skipped: ${skipped}.`,
          imported,
          skipped,
          errors: errors.length > 0 ? errors : undefined
        });
      });
  } catch (error) {
    console.error('Error importing faculty:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path).catch(() => {});
    }
    res.status(500).json({ success: false, message: 'Server error during import' });
  }
};

export default {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  importFaculty,
};
