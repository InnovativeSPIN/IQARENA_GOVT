import pool from '../../config/db.js';

// Assign a test to a school and standard
export const assignTestToSchool = async (req, res) => {
  try {
    const { test_id } = req.params;
    const { school_id, standard } = req.body; // standard can be null/empty for all standards

    if (!school_id) {
      return res.status(400).json({ success: false, message: 'School ID is required' });
    }

    // Check if test exists
    const [test] = await pool.query('SELECT id FROM tests WHERE id = ?', [test_id]);
    if (test.length === 0) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    // Check if school exists
    const [school] = await pool.query('SELECT id FROM schools WHERE id = ?', [school_id]);
    if (school.length === 0) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    const std = standard || null;

    // Check if already assigned
    const [existing] = await pool.query(
      'SELECT id FROM school_test_assignments WHERE test_id = ? AND school_id = ? AND (standard = ? OR (? IS NULL AND standard IS NULL))',
      [test_id, school_id, std, std]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Test is already assigned to this school/standard' });
    }

    // Create assignment
    await pool.query(
      'INSERT INTO school_test_assignments (test_id, school_id, standard) VALUES (?, ?, ?)',
      [test_id, school_id, std]
    );

    res.status(201).json({ success: true, message: 'Test assigned successfully' });
  } catch (error) {
    console.error('Error assigning test:', error);
    res.status(500).json({ success: false, message: 'Server error assigning test' });
  }
};

// Get assignments for a test
export const getTestAssignments = async (req, res) => {
  try {
    const { test_id } = req.params;
    
    const [assignments] = await pool.query(`
      SELECT sta.id, sta.standard, sta.assigned_at, 
             s.id as school_id, s.school_name, s.school_code, s.district
      FROM school_test_assignments sta
      JOIN schools s ON sta.school_id = s.id
      WHERE sta.test_id = ?
      ORDER BY s.school_name ASC
    `, [test_id]);

    res.json({ success: true, assignments });
  } catch (error) {
    console.error('Error fetching test assignments:', error);
    res.status(500).json({ success: false, message: 'Server error fetching assignments' });
  }
};

// Delete an assignment
export const deleteTestAssignment = async (req, res) => {
  try {
    const { id } = req.params; // assignment id
    
    const [result] = await pool.query('DELETE FROM school_test_assignments WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    res.json({ success: true, message: 'Assignment removed successfully' });
  } catch (error) {
    console.error('Error deleting test assignment:', error);
    res.status(500).json({ success: false, message: 'Server error removing assignment' });
  }
};
