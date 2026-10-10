import pool from '../../config/db.js';
import fs from 'fs';
import path from 'path';

// Get all ebooks with optional search and filters
export const getEBooks = async (req, res) => {
  try {
    const { search, class_grade, subject_name, exam_name, status } = req.query;

    let query = 'SELECT * FROM ebooks WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (title LIKE ? OR author LIKE ? OR description LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (class_grade && class_grade !== 'ALL') {
      query += ' AND class_grade = ?';
      params.push(class_grade);
    }

    if (subject_name && subject_name !== 'ALL') {
      query += ' AND subject_name = ?';
      params.push(subject_name);
    }

    if (exam_name && exam_name !== 'ALL') {
      query += ' AND exam_name = ?';
      params.push(exam_name);
    }

    if (status !== undefined && status !== 'ALL' && status !== '') {
      query += ' AND status = ?';
      params.push(status === '1' || status === 1 || status === 'true' ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC';

    const [ebooks] = await pool.query(query, params);

    // Compute stats
    const totalEBooks = ebooks.length;
    const activeEBooks = ebooks.filter(b => b.status === 1 || b.status === true).length;
    const totalDownloads = ebooks.reduce((acc, b) => acc + (Number(b.download_count) || 0), 0);
    const uniqueSubjects = new Set(ebooks.map(b => b.subject_name).filter(Boolean)).size;

    res.json({
      success: true,
      ebooks,
      stats: {
        totalEBooks,
        activeEBooks,
        totalDownloads,
        uniqueSubjects,
      }
    });
  } catch (error) {
    console.error('Error fetching ebooks:', error);
    res.status(500).json({ success: false, message: 'Server error fetching ebooks' });
  }
};

// Get single ebook by ID
export const getEBookById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM ebooks WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'E-Book not found' });
    }

    res.json({ success: true, ebook: rows[0] });
  } catch (error) {
    console.error('Error fetching ebook by id:', error);
    res.status(500).json({ success: false, message: 'Server error fetching ebook' });
  }
};

// Create a new E-Book
export const createEBook = async (req, res) => {
  try {
    const {
      title,
      author,
      class_grade,
      subject_name,
      exam_name,
      description,
      status = 1,
      cover_url: inputCoverUrl,
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'E-Book title is required' });
    }

    let file_url = req.body.file_url;
    let cover_url = inputCoverUrl || null;
    let file_size = req.body.file_size || 'N/A';
    let file_type = req.body.file_type || 'pdf';

    const fileObj = req.files?.file?.[0] || req.file;
    const coverObj = req.files?.cover_image?.[0];

    // If document file was uploaded via multer
    if (fileObj) {
      file_url = `/uploads/ebooks/${fileObj.filename}`;
      const bytes = fileObj.size;
      if (bytes < 1024 * 1024) {
        file_size = (bytes / 1024).toFixed(1) + ' KB';
      } else {
        file_size = (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      }
      file_type = path.extname(fileObj.originalname).replace('.', '').toLowerCase() || 'pdf';
    }

    // If cover image file was uploaded
    if (coverObj) {
      cover_url = `/uploads/ebooks/${coverObj.filename}`;
    }

    if (!file_url) {
      return res.status(400).json({ success: false, message: 'E-Book PDF file or URL is required' });
    }

    const [result] = await pool.query(
      `INSERT INTO ebooks (title, author, class_grade, subject_name, exam_name, description, file_url, cover_url, file_size, file_type, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        author || null,
        class_grade || null,
        subject_name || null,
        exam_name || null,
        description || null,
        file_url,
        cover_url || null,
        file_size,
        file_type,
        status === '0' || status === 0 || status === false ? 0 : 1,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'E-Book created successfully',
      ebookId: result.insertId,
    });
  } catch (error) {
    console.error('Error creating ebook:', error);
    res.status(500).json({ success: false, message: 'Server error creating ebook' });
  }
};

// Update an existing E-Book
export const updateEBook = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      author,
      class_grade,
      subject_name,
      exam_name,
      description,
      status,
      cover_url,
    } = req.body;

    const [existing] = await pool.query('SELECT * FROM ebooks WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'E-Book not found' });
    }

    let file_url = req.body.file_url !== undefined ? req.body.file_url : existing[0].file_url;
    let file_size = req.body.file_size !== undefined ? req.body.file_size : existing[0].file_size;
    let file_type = req.body.file_type !== undefined ? req.body.file_type : existing[0].file_type;
    let updatedCoverUrl = cover_url !== undefined ? cover_url : existing[0].cover_url;

    const fileObj = req.files?.file?.[0] || req.file;
    const coverObj = req.files?.cover_image?.[0];

    if (fileObj) {
      file_url = `/uploads/ebooks/${fileObj.filename}`;
      const bytes = fileObj.size;
      if (bytes < 1024 * 1024) {
        file_size = (bytes / 1024).toFixed(1) + ' KB';
      } else {
        file_size = (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      }
      file_type = path.extname(fileObj.originalname).replace('.', '').toLowerCase() || 'pdf';
    }

    if (coverObj) {
      updatedCoverUrl = `/uploads/ebooks/${coverObj.filename}`;
    }

    const updatedTitle = title !== undefined ? title : existing[0].title;
    const updatedAuthor = author !== undefined ? author : existing[0].author;
    const updatedClassGrade = class_grade !== undefined ? class_grade : existing[0].class_grade;
    const updatedSubjectName = subject_name !== undefined ? subject_name : existing[0].subject_name;
    const updatedExamName = exam_name !== undefined ? exam_name : existing[0].exam_name;
    const updatedDescription = description !== undefined ? description : existing[0].description;
    const updatedStatus = status !== undefined
      ? (status === '0' || status === 0 || status === false ? 0 : 1)
      : existing[0].status;

    await pool.query(
      `UPDATE ebooks
       SET title = ?, author = ?, class_grade = ?, subject_name = ?, exam_name = ?, description = ?, file_url = ?, cover_url = ?, file_size = ?, file_type = ?, status = ?
       WHERE id = ?`,
      [
        updatedTitle,
        updatedAuthor,
        updatedClassGrade,
        updatedSubjectName,
        updatedExamName,
        updatedDescription,
        file_url,
        updatedCoverUrl,
        file_size,
        file_type,
        updatedStatus,
        id,
      ]
    );

    res.json({ success: true, message: 'E-Book updated successfully' });
  } catch (error) {
    console.error('Error updating ebook:', error);
    res.status(500).json({ success: false, message: 'Server error updating ebook' });
  }
};

// Delete an E-Book
export const deleteEBook = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT * FROM ebooks WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'E-Book not found' });
    }

    // Try deleting physical file if stored locally in uploads/ebooks
    const fileUrl = existing[0].file_url;
    if (fileUrl && fileUrl.startsWith('/uploads/ebooks/')) {
      const filePath = path.join(process.cwd(), fileUrl.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkErr) {
          console.warn('Could not remove file on disk:', unlinkErr.message);
        }
      }
    }

    await pool.query('DELETE FROM ebooks WHERE id = ?', [id]);
    res.json({ success: true, message: 'E-Book deleted successfully' });
  } catch (error) {
    console.error('Error deleting ebook:', error);
    res.status(500).json({ success: false, message: 'Server error deleting ebook' });
  }
};

// Increment download count
export const incrementDownload = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE ebooks SET download_count = download_count + 1 WHERE id = ?', [id]);
    const [rows] = await pool.query('SELECT download_count, file_url FROM ebooks WHERE id = ?', [id]);
    res.json({
      success: true,
      download_count: rows[0]?.download_count || 0,
      file_url: rows[0]?.file_url
    });
  } catch (error) {
    console.error('Error tracking download:', error);
    res.status(500).json({ success: false, message: 'Server error tracking download' });
  }
};
