import pool from '../../config/db.js';
import fs from 'fs';
import csvParser from 'csv-parser';
import XLSX from 'xlsx';
import bcrypt from 'bcryptjs';

// Bulk upload schools from Excel file (format: Sl.No, UDISE, SCHOOL NAME, Management)
export const bulkImportSchools = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  try {
    const buf = fs.readFileSync(req.file.path);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Find the header row (contains "UDISE" or "SCHOOL NAME")
    let headerIdx = -1;
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i].map(c => String(c).toUpperCase().trim());
      if (row.some(c => c.includes('UDISE') || c.includes('SCHOOL NAME'))) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
      return res.status(400).json({ success: false, message: 'Could not find header row with UDISE and SCHOOL NAME columns' });
    }

    const headers = rawRows[headerIdx].map(c => String(c).toUpperCase().trim());
    const udiseCol = headers.findIndex(h => h.includes('UDISE'));
    const nameCol = headers.findIndex(h => h.includes('SCHOOL NAME') || h.includes('NAME'));
    const mgmtCol = headers.findIndex(h => h.includes('MANAGEMENT') || h.includes('MGMT'));
    const distCol = headers.findIndex(h => h.includes('DISTRICT') || h.includes('DIST'));

    if (udiseCol === -1 || nameCol === -1) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
      return res.status(400).json({ success: false, message: 'Required columns UDISE and SCHOOL NAME not found' });
    }

    let imported = 0, skipped = 0;
    const errors = [];
    const dataRows = rawRows.slice(headerIdx + 1);

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const udise = String(row[udiseCol] || '').trim();
      const school_name = String(row[nameCol] || '').trim();
      if (!udise || !school_name || udise === '0') { skipped++; continue; }
      const management = mgmtCol >= 0 ? String(row[mgmtCol] || 'Government').trim() : 'Government';
      const district = distCol >= 0 ? String(row[distCol] || '').trim() : null;
      try {
        await pool.query(
          `INSERT INTO schools (school_name, udise_code, management, district)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE school_name = VALUES(school_name), management = VALUES(management), district = COALESCE(VALUES(district), district)`,
          [school_name, udise, management, district || null]
        );

        // Fetch school ID to link user account
        const [scRows] = await pool.query('SELECT id FROM schools WHERE udise_code = ?', [udise]);
        const schoolId = scRows.length > 0 ? scRows[0].id : null;

        // Auto-provision school login account in users table (role_id 2 = FACULTY / SCHOOL)
        const defaultHash = await bcrypt.hash(udise, 10);
        await pool.query(
          `INSERT INTO users (userid, role_id, school_id, name, password, status)
           VALUES (?, 2, ?, ?, ?, 1)
           ON DUPLICATE KEY UPDATE school_id = COALESCE(VALUES(school_id), school_id), name = VALUES(name)`,
          [udise, schoolId, school_name, defaultHash]
        );

        imported++;
      } catch (err) {
        skipped++;
        errors.push(`Row ${headerIdx + i + 2}: ${err.message}`);
      }
    }
    try { fs.unlinkSync(req.file.path); } catch (_) {}
    res.json({ success: true, message: `Import complete. Added/Updated: ${imported}. Skipped: ${skipped}.`, imported, skipped, errors: errors.length ? errors : undefined });
  } catch (error) {
    try { if (req.file) fs.unlinkSync(req.file.path); } catch (_) {}
    console.error('School bulk import error:', error);
    res.status(500).json({ success: false, message: 'Server error during import', error: error.message });
  }
};

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

    const schoolId = result.insertId;
    const loginCode = udise_code || school_code;
    if (loginCode) {
      try {
        const defaultHash = await bcrypt.hash(String(loginCode).trim(), 10);
        await pool.query(
          `INSERT INTO users (userid, role_id, school_id, name, password, status)
           VALUES (?, 2, ?, ?, ?, 1)
           ON DUPLICATE KEY UPDATE school_id = VALUES(school_id), name = VALUES(name)`,
          [String(loginCode).trim(), schoolId, school_name, defaultHash]
        );
      } catch (uErr) {
        console.warn('Auto-provision school user failed (non-fatal):', uErr.message);
      }
    }

    res.status(201).json({ 
      success: true, 
      message: 'School created successfully',
      schoolId: schoolId 
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
      .pipe(csvParser({
        // Strip BOM and trim whitespace from headers
        mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '').trim().replace(/\\n/g, '').replace(/\n/g, '').toLowerCase(),
      }))
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        let imported = 0;
        let skipped = 0;
        const errors = [];

        for (let i = 0; i < results.length; i++) {
          const row = results[i];

          // Normalize all keys (trim whitespace and \n from values too)
          const get = (key) => {
            for (const k of Object.keys(row)) {
              if (k.trim().toLowerCase().replace(/\\n/g, '') === key.toLowerCase()) {
                return typeof row[k] === 'string' ? row[k].trim() : row[k];
              }
            }
            return undefined;
          };

          const emis_no = get('emis_no') || get('emis') || get('emisno');
          const student_name = get('student_name') || get('name') || get('studentname');
          // standard can come from form body or CSV; allow empty and store as null
          const standard = bodyStandard?.trim() || get('standard') || get('class') || get('std') || null;
          const section = bodySection?.trim() || get('section') || null;
          const phone = get('phone') || get('mobile') || get('contact') || null;

          if (!emis_no || !student_name) {
            skipped++;
            errors.push(`Row ${i + 2}: Missing required fields (EMIS No, Student Name)`);
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
        try { fs.unlinkSync(req.file.path); } catch (_) {}

        res.json({
          success: true,
          message: `Import complete. Imported/Updated: ${imported}. Skipped: ${skipped}.`,
          imported,
          skipped,
          errors: errors.length > 0 ? errors : undefined
        });
      })
      .on('error', (err) => {
        console.error('CSV parse error:', err);
        try { fs.unlinkSync(req.file.path); } catch (_) {}
        res.status(400).json({ success: false, message: 'Failed to parse CSV file: ' + err.message });
      });
  } catch (error) {
    console.error('Error importing students:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path).catch(() => {});
    }
    res.status(500).json({ success: false, message: 'Server error during import' });
  }
};
