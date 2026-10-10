import pool from '../../config/db.js';

// Get active ebooks for students
export const getStudentEBooks = async (req, res) => {
  try {
    const { search, exam_name, subject_name, class_grade } = req.query;

    let query = `
      SELECT id, title, exam_name, subject_name, class_grade, description,
             file_url, cover_url, file_size, file_type, download_count, created_at
      FROM ebooks
      WHERE status = 1
    `;
    const params = [];

    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ? OR exam_name LIKE ? OR subject_name LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    if (exam_name && exam_name !== 'ALL') {
      query += ' AND exam_name = ?';
      params.push(exam_name);
    }

    if (subject_name && subject_name !== 'ALL') {
      query += ' AND subject_name = ?';
      params.push(subject_name);
    }

    if (class_grade && class_grade !== 'ALL') {
      query += ' AND class_grade = ?';
      params.push(class_grade);
    }

    query += ' ORDER BY created_at DESC';

    const [ebooks] = await pool.query(query, params);

    res.json({
      success: true,
      ebooks,
    });
  } catch (error) {
    console.error('Error fetching student ebooks:', error);
    res.status(500).json({ success: false, message: 'Server error fetching ebooks' });
  }
};

// Track student download and return file URL
export const downloadStudentEBook = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE ebooks SET download_count = download_count + 1 WHERE id = ?', [id]);
    const [rows] = await pool.query('SELECT file_url, title FROM ebooks WHERE id = ?', [id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'E-Book not found' });
    }

    res.json({
      success: true,
      file_url: rows[0].file_url,
      title: rows[0].title,
    });
  } catch (error) {
    console.error('Error tracking student ebook download:', error);
    res.status(500).json({ success: false, message: 'Server error tracking download' });
  }
};
