import pool from '../../config/db.js';
import fs from 'fs';
import csvParser from 'csv-parser';

// Get all schools
export const getSchools = async (req, res) => {
  try {
    const [schools] = await pool.query('SELECT * FROM schools ORDER BY school_name ASC');
    res.json({ success: true, schools });
  } catch (error) {
    console.error('Error fetching schools:', error);
    res.status(500).json({ success: false, message: 'Server error fetching schools' });
  }
};

// Get a single school by ID
export const getSchoolById = async (req, res) => {
  try {
    const { id } = req.params;
    const [school] = await pool.query('SELECT * FROM schools WHERE id = ?', [id]);
    
    if (school.length === 0) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }
    
    res.json({ success: true, school: school[0] });
  } catch (error) {
    console.error('Error fetching school:', error);
    res.status(500).json({ success: false, message: 'Server error fetching school' });
  }
};

// Create a new school
export const createSchool = async (req, res) => {
  try {
    const { school_name, school_code, udise_code, state_emis_id, district, management, address, contact_phone } = req.body;
    
    if (!school_name) {
      return res.status(400).json({ success: false, message: 'School name is required' });
    }

    const [result] = await pool.query(
      'INSERT INTO schools (school_name, school_code, udise_code, state_emis_id, district, management, address, contact_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [school_name, school_code || null, udise_code || null, state_emis_id || null, district || null, management || 'Government', address || null, contact_phone || null]
    );

    res.status(201).json({ 
      success: true, 
      message: 'School created successfully',
      schoolId: result.insertId 
    });
  } catch (error) {
    console.error('Error creating school:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'School code already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error creating school' });
  }
};

// Update a school
export const updateSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const { school_name, school_code, udise_code, state_emis_id, district, management, address, contact_phone, status } = req.body;
    
    const [result] = await pool.query(
      'UPDATE schools SET school_name = ?, school_code = ?, udise_code = ?, state_emis_id = ?, district = ?, management = ?, address = ?, contact_phone = ?, status = ? WHERE id = ?',
      [school_name, school_code || null, udise_code || null, state_emis_id || null, district || null, management || 'Government', address || null, contact_phone || null, status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    res.json({ success: true, message: 'School updated successfully' });
  } catch (error) {
    console.error('Error updating school:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'School code already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error updating school' });
  }
};

// Delete a school
export const deleteSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM schools WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    res.json({ success: true, message: 'School deleted successfully' });
  } catch (error) {
    console.error('Error deleting school:', error);
    res.status(500).json({ success: false, message: 'Server error deleting school' });
  }
};

// Get students for a specific school
export const getSchoolStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const [students] = await pool.query('SELECT * FROM school_students WHERE school_id = ? ORDER BY standard, student_name', [id]);
    res.json({ success: true, students });
  } catch (error) {
    console.error('Error fetching school students:', error);
    res.status(500).json({ success: false, message: 'Server error fetching students' });
  }
};

// Import students via CSV
export const importStudents = async (req, res) => {
  try {
    const { id } = req.params; // school_id

    const { standard: bodyStandard, section: bodySection, batch_year, exam_id } = req.body;

    // Check if school exists
    const [school] = await pool.query('SELECT * FROM schools WHERE id = ?', [id]);
    if (school.length === 0) {
       // clean up uploaded file
       if (req.file) fs.unlinkSync(req.file.path);
       return res.status(404).json({ success: false, message: 'School not found' });
    }

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

        for (let i = 0; i < results.length; i++) {
          const row = results[i];
          const emis_no = row.emis_no?.trim() || row.EMIS?.trim() || row.emis?.trim();
          const student_name = row.student_name?.trim() || row.name?.trim() || row.Name?.trim();
          const standard = bodyStandard?.trim() || row.standard?.trim() || row.class?.trim() || row.Class?.trim();
          const section = bodySection?.trim() || row.section?.trim() || null;
          const phone = row.phone?.trim() || null;
          
          if (!emis_no || !student_name || !standard) {
            skipped++;
            errors.push(`Row ${i + 2}: Missing required fields (EMIS, Name, Standard)`);
            continue;
          }

          try {
            await pool.query(
              'INSERT INTO school_students (emis_no, student_name, school_id, standard, section, phone, batch_year, exam_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ' +
              'ON DUPLICATE KEY UPDATE student_name = ?, school_id = ?, standard = ?, section = ?, phone = ?, batch_year = ?, exam_id = ?',
              [emis_no, student_name, id, standard, section, phone, batch_year || null, exam_id || null,
               student_name, id, standard, section, phone, batch_year || null, exam_id || null]
            );
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
          message: `Import complete. Imported/Updated: ${imported}. Skipped: ${skipped}.`,
          imported,
          skipped,
          errors: errors.length > 0 ? errors : undefined
        });
      });
  } catch (error) {
    console.error('Error importing students:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path).catch(() => {});
    }
    res.status(500).json({ success: false, message: 'Server error during import' });
  }
};
